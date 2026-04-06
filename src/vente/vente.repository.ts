import { Injectable } from "@nestjs/common";
import { Vente } from "./vente.model";
import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class VenteRepository extends Repository<Vente>{
  constructor(@InjectDataSource() dataSource: DataSource) {
        super(Vente, dataSource.createEntityManager());
    }

}