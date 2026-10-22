import { Injectable, NotFoundException } from '@nestjs/common';
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

  // CREATE
  async create(data: Partial<Discussion>) { const discussion = this.repo.create(data); return this.repo.save(discussion);}

  // GET ALL
  async findAll() { return this.repo.find();}

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
