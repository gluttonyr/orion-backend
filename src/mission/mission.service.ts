import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Mission, StatutCandidature, StatutMission } from './mission.model';
import { MissionRepository } from './mission.repository';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { MissionTypeService } from '../mission-type/mission-type.service';
import { NotificationService } from '../notification/notification.service';
import { DiscussionRepository } from '../discussion/discussion.repository';
import { DiscussionType } from '../discussion/discussion.model';
import { DiscussionParticipantRepository } from '../discussion-participant/discussion-participant.repository';

type SessionClaims = { sub: number; role?: string };
type CandidateStatus = 'acceptee' | 'refusee';

@Injectable()
export class MissionService {
  constructor(
    private readonly missions: MissionRepository,
    private readonly jwt: JwtService,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
    private readonly missionTypes: MissionTypeService,
    private readonly notifications: NotificationService,
    private readonly discussions: DiscussionRepository,
    private readonly discussionParticipants: DiscussionParticipantRepository,
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
    details.type = await this.missionTypes.assertExists(details.type ?? 'Mission rémunérée');
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

  async findMyApplications(token?: string) {
    const { sub } = await this.getSession(token, 'UTILISATEUR');
    const missions = await this.missions.find({
      relations: ['commercant'],
      order: { datePublication: 'DESC' },
    });
    return missions.flatMap((mission) => {
      const application = (mission.candidatures ?? []).find((candidate) => candidate.userId === Number(sub));
      if (!application) return [];
      const { candidatures: _candidatures, ...missionDetails } = mission;
      return [{
        ...missionDetails,
        candidature: application,
        commercant: mission.commercant ? this.publicUser(mission.commercant) : null,
      }];
    });
  }

  async findOne(id: number, token?: string) {
    const mission = await this.missions.findOne({ where: { id }, relations: ['commercant'] });
    if (!mission) return null;
    if (mission.statut !== StatutMission.OUVERTE || !mission.publicationPayee) {
      if (!token) throw new NotFoundException(`Mission avec id ${id} introuvable`);
      const { sub } = await this.getSession(token, 'COMMERCANT');
      if (mission.commercant?.id !== Number(sub)) throw new NotFoundException(`Mission avec id ${id} introuvable`);
    }
    return {
      ...mission,
      commercant: mission.commercant ? this.publicUser(mission.commercant) : null,
      candidatures: [],
    };
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
    if (mission.commercant?.id) {
      await this.notifications.notifyMissionApplication(mission.commercant.id, mission.id, Number(sub), mission.titre);
    }
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
    const previousStatus = candidate.statut;
    const isAccepted = (value: string) => value === 'acceptee' || value === 'acceptée' || value === 'accepté';
    if (status === 'acceptee' && candidates.some((item) => item.userId !== userId && isAccepted(item.statut))) {
      throw new ConflictException('Vous avez déjà accepté une candidature. Refusez-la avant d’en accepter une autre.');
    }
    candidate.statut = status;
    if (status === 'acceptee') {
      const merchantId = mission.commercant.id;
      const participantRows = await this.discussionParticipants.find({
        where: [{ utilisateurId: merchantId }, { utilisateurId: userId }],
        relations: ['discussion'],
      });
      let discussion = participantRows.find((row) =>
        participantRows.some((other) => other.discussionId === row.discussionId && other.utilisateurId !== row.utilisateurId)
        && row.discussion?.type === DiscussionType.PRIVATE,
      )?.discussion;
      if (!discussion) {
        discussion = await this.discussions.save(this.discussions.create({
          type: DiscussionType.PRIVATE,
          titre: mission.titre,
          lastMessage: `Candidature acceptée pour « ${mission.titre} »`,
          lastMessageDate: new Date(),
        }));
        await this.discussionParticipants.save([
          this.discussionParticipants.create({ discussionId: discussion.id, utilisateurId: merchantId }),
          this.discussionParticipants.create({ discussionId: discussion.id, utilisateurId: userId }),
        ]);
      }
      candidate.discussionId = discussion.id;
    }
    mission.candidatures = candidates;
    await this.missions.save(mission);
    if (previousStatus !== status) {
      await this.notifications.notifyMissionApplicationStatus(userId, mission.id, mission.titre, status === 'acceptee');
    }
    return candidate;
  }

  private publicUser(user: Utilisateur) {
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      adresse: user.adresse,
      telephone: user.contact,
      specialite: user.specialite,
      image: user.image,
    };
  }

  async update(id: number, body: Partial<Mission>, token?: string) {
    const mission = await this.getOwnedMission(id, token);
    const { candidatures, commercant, publicationPayee: _payment, ...editableFields } = body;
    if (editableFields.type !== undefined && editableFields.type !== mission.type) {
      editableFields.type = await this.missionTypes.assertExists(editableFields.type);
    }
    if (editableFields.statut === StatutMission.OUVERTE && !mission.publicationPayee) throw new ConflictException('Le paiement de 500 FCFA doit être confirmé avant la publication.');
    Object.assign(mission, editableFields);
    return this.missions.save(mission);
  }

  async remove(id: number, token?: string) {
    const mission = await this.getOwnedMission(id, token);
    return this.missions.remove(mission);
  }
}
