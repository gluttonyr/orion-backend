import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categorie } from './categorie.model';
import { CategorieService } from './categorie.service';
import { CategorieRepository } from './categorie.repository';
import { CategorieController } from './categorie.controller';


@Module({
    imports: [TypeOrmModule.forFeature([Categorie])],
    controllers: [CategorieController],
    providers:[
       CategorieService,
       CategorieRepository
    ]
})
export class CategorieModule {}
