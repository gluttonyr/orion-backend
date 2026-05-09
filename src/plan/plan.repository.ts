import { Injectable } from "@nestjs/common";
import { Plan } from "./plan.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class PlanRepository extends Repository<Plan> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Plan, dataSource.createEntityManager());
  }
}