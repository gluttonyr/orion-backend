import { Injectable } from '@nestjs/common';
import { Mission } from './mission.model';
import { MissionRepository } from './mission.repository';

@Injectable()
export class MissionService {
    constructor(private readonly missions: MissionRepository,) {}

    create(body: Mission) {
        const mission = this.missions.create(body);
        return this.missions.save(mission);
    }

    findAll() { return this.missions.find();}

    findOne(arg: number) { return this.missions.findOne({ where: { id: arg } });}

    async update(arg: number, body: Partial<Mission>) {
        const mission = await this.missions.findOne({ where: { id: arg } });
        if (!mission) {
            throw new Error(`Mission avec id ${arg} introuvable`);
        }

       Object.assign(mission, body);
        return this.missions.save(mission);
    }

    async remove(arg: number) {
        const mission = await this.missions.findOne({ where: { id: arg } });
        if (!mission) { throw new Error(`Mission avec id ${arg} introuvable`);}
        return this.missions.remove(mission);
    }
}