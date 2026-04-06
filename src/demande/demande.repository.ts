import { Injectable } from "@nestjs/common";
import { Demande } from "./demande.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class DemandeRepository extends Repository<Demande> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Demande, dataSource.createEntityManager());
  }
}