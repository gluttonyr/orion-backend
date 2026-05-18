import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscussionParticipantRepository } from './discussion-participant.repository';
import { DiscussionParticipant } from './discussion-participant.model';

@Injectable()
export class DiscussionParticipantService {
  constructor(private readonly repo: DiscussionParticipantRepository) {}

  // CREATE
  async create(data: Partial<DiscussionParticipant>) { const discussionParticipant = this.repo.create(data); return this.repo.save(discussionParticipant);}

  // GET ALL
  async findAll() { return this.repo.find();}

  // GET ONE
  async findOne(id: number) {
    const discussionParticipant = await this.repo.findOne({ where: { id } });

    if (!discussionParticipant) {
      throw new NotFoundException(`DiscussionParticipant avec id ${id} introuvable`);
    }

    return discussionParticipant;
  }

  // UPDATE
  async update(id: number, data: Partial<DiscussionParticipant>) {
    const discussionParticipant = await this.findOne(id);

    Object.assign(discussionParticipant, data);

    return this.repo.save(discussionParticipant);
  }

  // DELETE
  async remove(id: number) {
    const discussionParticipant = await this.findOne(id);
    return this.repo.remove(discussionParticipant);
  }
}
