import { Injectable } from "@nestjs/common";
import { Message } from "./message.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Message, dataSource.createEntityManager());
  }
}