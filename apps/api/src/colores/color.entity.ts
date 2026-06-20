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
@Unique('uq_color_codigo', ['codigo'])
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

  // Nombre del color (clasificación), ej. "DARK"
  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  // Código único de la definición productiva (producto+variedad+color), ej. "6554"
  @Column({ type: 'varchar', length: 50, nullable: false })
  codigo: string;

  // Nombre comercial de la definición productiva, ej. "NELANDES ASTASSUS"
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'nombre_comercial' })
  nombreComercial: string | null;

  @Column({ type: 'int', nullable: true })
  longitud: number | null;

  @Column({ type: 'int', default: 400, name: 'tallos_por_caja' })
  tallosPorCaja: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'motivo_baja', type: 'text', nullable: true })
  motivoBaja: string | null;

  @OneToMany(() => RegistroDiario, (registro) => registro.color)
  registros: RegistroDiario[];

  @OneToMany(() => BaseSemanal, (base) => base.color)
  baseSemanal: BaseSemanal[];

  @OneToMany(() => ResponsableColor, (rc) => rc.color)
  responsablesAsignados: ResponsableColor[];

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.nombre) this.nombre = this.nombre.toUpperCase();
    if (this.codigo) this.codigo = this.codigo.toUpperCase().trim();
    if (this.nombreComercial) this.nombreComercial = this.nombreComercial.toUpperCase().trim();
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
