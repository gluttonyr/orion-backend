import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { Message } from './message.model';

@Injectable()
export class MessageService {
  constructor(private readonly repo: MessageRepository) {}

  // CREATE
  async create(data: Partial<Message>) {
    const message = this.repo.create(data);
    return this.repo.save(message);
  }

  // GET ALL
  async findAll() {
    return this.repo.find();
  }

  // GET ONE
  async findOne(id: number) {
    const message = await this.repo.findOne({ where: { id } });

    if (!message) {
      throw new NotFoundException(`Message avec id ${id} introuvable`);
    }

    return message;
  }

  // UPDATE
  async update(id: number, data: Partial<Message>) {
    const message = await this.findOne(id);

    Object.assign(message, data);

    return this.repo.save(message);
  }

  // DELETE
  async remove(id: number) {
    const message = await this.findOne(id);
    return this.repo.remove(message);
  }
}
