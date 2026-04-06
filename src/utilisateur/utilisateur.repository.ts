import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Utilisateur } from './utilisateur.model';

@Injectable()
export class UtilisateurRepository extends Repository<Utilisateur> {
  constructor(@InjectDataSource() dataSource: DataSource) {
        super(Utilisateur, dataSource.createEntityManager());
    }
}