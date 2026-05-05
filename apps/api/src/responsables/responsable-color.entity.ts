import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Responsable } from './responsable.entity';
import { Color } from '../colores/color.entity';

@Entity('responsable_colores')
@Unique(['responsableId', 'colorId'])
export class ResponsableColor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'responsable_id' })
  responsableId: string;

  @ManyToOne(() => Responsable, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Responsable;

  @Column({ name: 'color_id' })
  colorId: string;

  @ManyToOne(() => Color, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'color_id' })
  color: Color;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
