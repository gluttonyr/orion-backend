import { Injectable } from "@nestjs/common";
import { Panier } from "./panier.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class PanierRepository extends Repository<Panier> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Panier, dataSource.createEntityManager());
  }
}