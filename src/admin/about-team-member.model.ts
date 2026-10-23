import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AboutTeamMember {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;
  @Column() role!: string;
  @Column({ type: 'text', default: '' }) bio!: string;
  @Column({ nullable: true }) photo?: string;
  @Column({ type: 'integer', default: 0 }) position!: number;
}
