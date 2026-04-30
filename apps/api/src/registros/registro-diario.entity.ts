import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Semana } from '../semanas/semana.entity';
import { Color } from '../colores/color.entity';

export enum DiaSemana {
  DOMINGO = 'DOMINGO',
  LUNES = 'LUNES',
  MARTES = 'MARTES',
  MIERCOLES = 'MIERCOLES',
  JUEVES = 'JUEVES',
  VIERNES = 'VIERNES',
  SABADO = 'SABADO',
}

@Entity('registros_diarios')
export class RegistroDiario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'semana_id' })
  semanaId: string;

  @ManyToOne(() => Semana, (semana) => semana.registros, { nullable: false })
  @JoinColumn({ name: 'semana_id' })
  semana: Semana;

  @Column({ name: 'color_id' })
  colorId: string;

  @ManyToOne(() => Color, (color) => color.registros, { nullable: false })
  @JoinColumn({ name: 'color_id' })
  color: Color;

  @Column({ type: 'enum', enum: DiaSemana, nullable: false })
  dia: DiaSemana;

  @Column({ type: 'date', nullable: false })
  fecha: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cajas: number;

  // Configurable por registro; determina cuántos tallos equivale 1 caja
  @Column({ name: 'divisor_tallos', type: 'int', default: 400 })
  divisorTallos: number;

  // Calculado en el service: cajas / divisorTallos — no es columna generada en DB
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tallos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
