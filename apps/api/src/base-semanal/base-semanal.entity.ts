import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Color } from '../colores/color.entity';

@Entity('base_semanal')
@Unique(['colorId', 'numeroSemana', 'anio'])
export class BaseSemanal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'color_id' })
  colorId: string;

  @ManyToOne(() => Color, (color) => color.baseSemanal, { nullable: false })
  @JoinColumn({ name: 'color_id' })
  color: Color;

  @Column({ name: 'numero_semana', type: 'int', nullable: false })
  numeroSemana: number;

  @Column({ type: 'int', nullable: false })
  anio: number;

  @Column({ name: 'cajas_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cajasTotal: number;

  @Column({ name: 'tallos_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  tallosTotal: number;

  @Column({ name: 'cajas_estimadas', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cajasEstimadas: number;

  @Column({ name: 'tallos_estimados', type: 'decimal', precision: 10, scale: 2, default: 0 })
  tallosEstimados: number;

  // false = estimado, true = semana ya pasó (dato real)
  @Column({ name: 'es_real', type: 'boolean', default: false })
  esReal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
