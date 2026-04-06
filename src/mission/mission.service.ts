import { Injectable } from '@nestjs/common';
import { Mission } from './mission.model';

@Injectable()
export class MissionService {
    create(body: Partial<Mission>) {
        throw new Error('Method not implemented.');
    }
    findAll() {
        throw new Error('Method not implemented.');
    }
    findOne(arg0: number) {
        throw new Error('Method not implemented.');
    }
    update(arg0: number, body: Partial<Mission>) {
        throw new Error('Method not implemented.');
    }
    remove(arg0: number) {
        throw new Error('Method not implemented.');
    }
}
