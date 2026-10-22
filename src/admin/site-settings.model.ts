import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class SiteSettings {
  @PrimaryColumn({ type: 'integer', default: 1 }) id!: number;
  @Column({ type: 'text', default: '[]' }) heroImagesJson!: string;
  @Column({ type: 'text', default: '[]' }) carouselImagesJson!: string;
  @UpdateDateColumn() updatedAt!: Date;
}
