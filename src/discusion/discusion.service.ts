import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscussionRepository } from './discussion.repository';
import { Discussion } from './discussion.model';

@Injectable()
export class DiscussionService {
  constructor(private readonly repo: DiscussionRepository) {}

  // CREATE
  async create(data: Partial<Discussion>) {
    const discussion = this.repo.create(data);
    return this.repo.save(discussion);
  }

  // GET ALL
  async findAll() {
    return this.repo.find();
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
