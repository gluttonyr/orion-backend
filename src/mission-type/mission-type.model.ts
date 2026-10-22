import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mission_type')
@Index(['nom'], { unique: true })
export class MissionType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nom!: string;
}
