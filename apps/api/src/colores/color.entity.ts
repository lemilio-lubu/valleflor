import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Variedad } from '../variedades/variedad.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

@Entity('colores')
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'variedad_id' })
  variedadId: string;

  @ManyToOne(() => Variedad, (variedad) => variedad.colores, {
    nullable: false,
  })
  @JoinColumn({ name: 'variedad_id' })
  variedad: Variedad;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @OneToMany(() => RegistroDiario, (registro) => registro.color)
  registros: RegistroDiario[];

  @OneToMany(() => BaseSemanal, (base) => base.color)
  baseSemanal: BaseSemanal[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeNombre() {
    if (this.nombre) this.nombre = this.nombre.toUpperCase();
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
