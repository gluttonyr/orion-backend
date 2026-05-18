import { Injectable } from "@nestjs/common";
import { DiscussionParticipant } from "./discussion-participant.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class DiscussionParticipantRepository extends Repository<DiscussionParticipant> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(DiscussionParticipant, dataSource.createEntityManager());
  }
}