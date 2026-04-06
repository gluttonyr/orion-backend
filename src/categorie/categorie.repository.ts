import { Injectable } from "@nestjs/common";
import { Categorie } from "./categorie.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class CategorieRepository extends Repository<Categorie> {
  constructor(@InjectDataSource() dataSource: DataSource) {
        super(Categorie, dataSource.createEntityManager());
    }
}