import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Mission, StatutCandidature, StatutMission } from './mission.model';
import { MissionRepository } from './mission.repository';
import { Utilisateur } from '../utilisateur/utilisateur.model';

type SessionClaims = { sub: number; role?: string };
type CandidateStatus = 'acceptee' | 'refusee';

@Injectable()
export class MissionService {
  constructor(
    private readonly missions: MissionRepository,
    private readonly jwt: JwtService,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
  ) {}

  private async getSession(token?: string, role?: string): Promise<SessionClaims> {
    if (!token) throw new UnauthorizedException('Authentification requise');
    let claims: SessionClaims;
    try { claims = await this.jwt.verifyAsync<SessionClaims>(token); }
    catch { throw new UnauthorizedException('Token invalide ou expiré'); }
    if (!claims.sub || (role && claims.role !== role)) throw new ForbiddenException('Accès non autorisé');
    return claims;
  }

  private async getOwnedMission(id: number, token?: string): Promise<Mission> {
    const { sub } = await this.getSession(token, 'COMMERCANT');
    const mission = await this.missions.findOne({ where: { id }, relations: ['commercant'] });
    if (!mission) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    if (mission.commercant?.id !== Number(sub)) throw new ForbiddenException('Cette opportunité ne vous appartient pas.');
    return mission;
  }

  async create(body: Partial<Mission>, token?: string) {
    const { sub } = await this.getSession(token, 'COMMERCANT');
    const merchant = await this.users.findOne({ where: { id: Number(sub) } });
    if (!merchant) throw new NotFoundException('Compte commerçant introuvable');
    const { statut: _requestedStatus, publicationPayee: _requestedPayment, ...details } = body;
    return this.missions.save(this.missions.create({
      ...details, commercant: merchant, candidatures: [], statut: StatutMission.BROUILLON, publicationPayee: false,
    }));
  }

  async getMissionForPublication(id: number, merchantId: number) {
    const mission = await this.missions.findOne({ where: { id }, relations: ['commercant'] });
    if (!mission) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    if (mission.commercant?.id !== Number(merchantId)) throw new ForbiddenException('Cette opportunité ne vous appartient pas.');
    if (mission.publicationPayee || mission.statut === StatutMission.OUVERTE) throw new ConflictException('Cette mission a déjà été publiée.');
    if (mission.statut === StatutMission.ANNULEE) throw new ConflictException('Une mission annulée ne peut pas être publiée.');
    return mission;
  }

  async findAll() {
    const missions = await this.missions.find({ where: { statut: StatutMission.OUVERTE, publicationPayee: true } });
    return missions.map((mission) => ({ ...mission, candidatures: [] }));
  }

  async findMine(token?: string) {
    const { sub } = await this.getSession(token, 'COMMERCANT');
    const missions = await this.missions.find({ where: { commercant: { id: Number(sub) } }, order: { datePublication: 'DESC' } });
    return missions;
  }

  async findOne(id: number, token?: string) {
    const mission = await this.missions.findOne({ where: { id }, relations: ['commercant'] });
    if (!mission) return null;
    if (mission.statut !== StatutMission.OUVERTE || !mission.publicationPayee) {
      if (!token) throw new NotFoundException(`Mission avec id ${id} introuvable`);
      const { sub } = await this.getSession(token, 'COMMERCANT');
      if (mission.commercant?.id !== Number(sub)) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    }
    return { ...mission, candidatures: [] };
  }

  async apply(id: number, message: string, token?: string) {
    const { sub, role } = await this.getSession(token);
    if (role !== 'UTILISATEUR') throw new ForbiddenException('Seuls les profils entrepreneurs peuvent candidater.');
    const mission = await this.missions.findOne({ where: { id }, relations: ['commercant'] });
    if (!mission) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    if (mission.commercant?.id === Number(sub)) throw new ForbiddenException('Vous ne pouvez pas candidater à votre propre opportunité.');
    if (mission.statut !== StatutMission.OUVERTE || !mission.publicationPayee) throw new ConflictException('Cette opportunité n’est pas encore publiée.');
    const candidates = mission.candidatures ?? [];
    if (candidates.some((candidate) => candidate.userId === Number(sub))) throw new ConflictException('Vous avez déjà candidaté à cette opportunité.');
    const user = await this.users.findOne({ where: { id: Number(sub) } });
    if (!user) throw new NotFoundException('Votre compte est introuvable');
    const candidate = {
      userId: Number(sub), statut: StatutCandidature.EN_ATTENTE, dateCandidature: new Date(),
      experience: 0, paymentHistory: [], totalPaid: 0,
      message: message?.trim() || 'Candidature envoyée depuis Orion.',
    };
    mission.candidatures = [...candidates, candidate];
    await this.missions.save(mission);
    return { ...candidate, candidat: this.publicUser(user) };
  }

  async getMyApplication(id: number, token?: string) {
    const { sub, role } = await this.getSession(token);
    if (role !== 'UTILISATEUR') throw new ForbiddenException('Accès réservé aux profils entrepreneurs.');
    const mission = await this.missions.findOne({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    return (mission.candidatures ?? []).find((candidate) => candidate.userId === Number(sub)) ?? null;
  }

  async getCandidates(id: number, token?: string) {
    const mission = await this.getOwnedMission(id, token);
    return Promise.all((mission.candidatures ?? []).map(async (candidate) => {
      const user = await this.users.findOne({ where: { id: candidate.userId } });
      return { ...candidate, candidat: user ? this.publicUser(user) : { id: candidate.userId, nom: 'Compte indisponible', prenom: '', email: '', specialite: '', image: '' } };
    }));
  }

  async updateCandidateStatus(id: number, userId: number, status: CandidateStatus, token?: string) {
    if (status !== 'acceptee' && status !== 'refusee') throw new ForbiddenException('Statut de candidature invalide.');
    const mission = await this.getOwnedMission(id, token);
    const candidates = mission.candidatures ?? [];
    const candidate = candidates.find((item) => item.userId === userId);
    if (!candidate) throw new NotFoundException('Candidature introuvable');
    candidate.statut = status;
    mission.candidatures = candidates;
    await this.missions.save(mission);
    return candidate;
  }

  private publicUser(user: Utilisateur) {
    return { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, specialite: user.specialite, image: user.image };
  }

  async update(id: number, body: Partial<Mission>, token?: string) {
    const mission = await this.getOwnedMission(id, token);
    const { candidatures, commercant, publicationPayee: _payment, ...editableFields } = body;
    if (editableFields.statut === StatutMission.OUVERTE && !mission.publicationPayee) throw new ConflictException('Le paiement de 500 FCFA doit être confirmé avant la publication.');
    Object.assign(mission, editableFields);
    return this.missions.save(mission);
  }

  async remove(id: number, token?: string) {
    const mission = await this.getOwnedMission(id, token);
    return this.missions.remove(mission);
  }
}
