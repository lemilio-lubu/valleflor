import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Variedad } from '../variedades/variedad.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';

@Entity('colores')
@Unique('uq_color_nombre_variedad', ['variedadId', 'nombre'])
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'variedad_id' })
  variedadId: string;

  @ManyToOne(() => Variedad, (variedad) => variedad.colores, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variedad_id' })
  variedad: Variedad;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'motivo_baja', type: 'text', nullable: true })
  motivoBaja: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'codigo' })
  codigo: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'nombre_original' })
  nombreOriginal: string | null;

  @OneToMany(() => RegistroDiario, (registro) => registro.color)
  registros: RegistroDiario[];

  @OneToMany(() => BaseSemanal, (base) => base.color)
  baseSemanal: BaseSemanal[];

  @OneToMany(() => ResponsableColor, (rc) => rc.color)
  responsablesAsignados: ResponsableColor[];

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
