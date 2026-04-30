import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Responsable } from '../responsables/responsable.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';

@Entity('semanas')
export class Semana {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'numero_semana', type: 'int', nullable: false })
  numeroSemana: number;

  @Column({ type: 'int', nullable: false })
  anio: number;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: false })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: false })
  fechaFin: string;

  @Column({ name: 'responsable_id' })
  responsableId: string;

  @ManyToOne(() => Responsable, (responsable) => responsable.semanas, {
    nullable: false,
  })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Responsable;

  @OneToMany(() => RegistroDiario, (registro) => registro.semana)
  registros: RegistroDiario[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
