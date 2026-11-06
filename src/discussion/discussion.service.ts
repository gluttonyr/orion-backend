import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscussionRepository } from './discussion.repository';
import { Discussion } from './discussion.model';

@Injectable()
export class DiscussionService {
  constructor(private readonly repo: DiscussionRepository) {}

  async findForUser(userId: number) {
    const discussions = await this.repo.createQueryBuilder('discussion')
      .innerJoin('discussion.participants', 'ownParticipant', 'ownParticipant.utilisateurId = :userId', { userId })
      .leftJoinAndSelect('discussion.participants', 'participant')
      .leftJoinAndSelect('participant.utilisateur', 'user')
      .getMany();

    return discussions.map((discussion) => ({
      id: discussion.id,
      type: discussion.type,
      statut: discussion.statut,
      titre: discussion.titre,
      photo: discussion.photo,
      lastMessage: discussion.lastMessage,
      lastMessageDate: discussion.lastMessageDate,
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
      contactUser: discussion.participants
        .filter((participant) => participant.utilisateurId !== userId)
        .map(({ utilisateur }) => utilisateur ? ({
          id: utilisateur.id,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          image: utilisateur.image,
        }) : null)
        .find(Boolean) ?? null,
    }));
  }

  private async assertParticipant(id: number, userId: number) {
    const count = await this.repo.createQueryBuilder('discussion')
      .innerJoin('discussion.participants', 'participant', 'participant.utilisateurId = :userId', { userId })
      .where('discussion.id = :id', { id })
      .getCount();
    if (!count) throw new ForbiddenException('Vous ne participez pas à cette discussion.');
  }

  async findOneForUser(id: number, userId: number) {
    const discussion = await this.findOne(id);
    await this.assertParticipant(id, userId);
    return (await this.findForUser(userId)).find((item) => item.id === discussion.id) ?? discussion;
  }

  // Seuls le titre et le statut (archiver) sont modifiables par un participant.
  async updateForUser(id: number, data: Partial<Discussion>, userId: number) {
    const discussion = await this.findOne(id);
    await this.assertParticipant(id, userId);
    if (typeof data?.titre === 'string') discussion.titre = data.titre.trim().slice(0, 120);
    if (data?.statut === 'active' || data?.statut === 'archived') discussion.statut = data.statut as Discussion['statut'];
    return this.repo.save(discussion);
  }

  async removeForUser(id: number, userId: number) {
    await this.findOne(id);
    await this.assertParticipant(id, userId);
    return this.remove(id);
  }

  // GET ONE
  async findOne(id: number) {
    const discussion = await this.repo.findOne({ where: { id } });

    if (!discussion) {
      throw new NotFoundException(`Discussion avec id ${id} introuvable`);
    }

    return discussion;
  }

  // UPDATE
  async update(id: number, data: Partial<Discussion>) {
    const discussion = await this.findOne(id);

    Object.assign(discussion, data);

    return this.repo.save(discussion);
  }

  // DELETE
  async remove(id: number) {
    const discussion = await this.findOne(id);
    return this.repo.remove(discussion);
  }
}
