import { Injectable } from "@nestjs/common";
import { Produit } from "./produit.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class ProduitRepository extends Repository<Produit> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Produit, dataSource.createEntityManager());
  }
}