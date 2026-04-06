import { Injectable } from "@nestjs/common";
import { Mission } from "./mission.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class MissionRepository extends Repository<Mission> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Mission, dataSource.createEntityManager());
  }
}