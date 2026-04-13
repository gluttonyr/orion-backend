import { Injectable } from "@nestjs/common";
import { Discussion } from "./discusion.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class DiscussionRepository extends Repository<Discussion> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Discussion, dataSource.createEntityManager());
  }
}