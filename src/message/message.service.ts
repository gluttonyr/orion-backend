import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { MessageRepository } from './message.repository';
import { Message, MessageStatus, MessageType } from './message.model';
import { DiscussionParticipantRepository } from '../discussion-participant/discussion-participant.repository';
import { DiscussionRepository } from '../discussion/discussion.repository';

@Injectable()
export class MessageService {
  constructor(
    private readonly repo: MessageRepository,
    private readonly participants: DiscussionParticipantRepository,
    private readonly discussions: DiscussionRepository,
  ) {}

  private async discussionIdsFor(userId: number) {
    const rows = await this.participants.find({ where: { utilisateurId: userId } });
    return rows.map((row) => row.discussionId);
  }

  private async assertParticipant(discussionId: number, userId: number) {
    const participant = await this.participants.findOne({ where: { discussionId, utilisateurId: userId } });
    if (!participant) throw new ForbiddenException('Vous ne participez pas à cette discussion.');
  }

  // CREATE — l'expéditeur est toujours l'utilisateur connecté
  async create(data: Partial<Message>, userId: number) {
    const discussionId = Number(data?.discussionId);
    const contenu = typeof data?.contenu === 'string' ? data.contenu.trim() : '';
    if (!Number.isSafeInteger(discussionId) || discussionId <= 0) throw new BadRequestException('Discussion invalide.');
    if (!contenu) throw new BadRequestException('Le message ne peut pas être vide.');
    if (contenu.length > 5000) throw new BadRequestException('Le message est trop long.');
    await this.assertParticipant(discussionId, userId);

    const type = Object.values(MessageType).includes(data.type as MessageType) ? data.type : MessageType.TEXT;
    const saved = await this.repo.save(this.repo.create({
      discussionId,
      senderId: userId,
      contenu,
      type,
      statut: MessageStatus.SENT,
      mediaUrl: typeof data.mediaUrl === 'string' ? data.mediaUrl : undefined,
    }));
    await this.discussions.update(discussionId, { lastMessage: contenu.slice(0, 255), lastMessageDate: saved.createdAt ?? new Date() });
    return saved;
  }

  // GET ALL — uniquement les messages des discussions de l'utilisateur
  async findAllForUser(userId: number) {
    const ids = await this.discussionIdsFor(userId);
    if (!ids.length) return [];
    return this.repo.find({ where: { discussionId: In(ids) }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: number) {
    const message = await this.repo.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Message avec id ${id} introuvable`);
    return message;
  }

  async findOneForUser(id: number, userId: number) {
    const message = await this.findOne(id);
    await this.assertParticipant(message.discussionId, userId);
    return message;
  }

  // UPDATE — seul l'auteur peut modifier le contenu de son message
  async update(id: number, data: Partial<Message>, userId: number) {
    const message = await this.findOne(id);
    if (message.senderId !== userId) throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages.');
    const contenu = typeof data?.contenu === 'string' ? data.contenu.trim() : '';
    if (!contenu) throw new BadRequestException('Le message ne peut pas être vide.');
    message.contenu = contenu;
    message.edited = true;
    return this.repo.save(message);
  }

  // DELETE — suppression logique par l'auteur
  async remove(id: number, userId: number) {
    const message = await this.findOne(id);
    if (message.senderId !== userId) throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages.');
    message.deleted = true;
    message.contenu = '';
    return this.repo.save(message);
  }
}
