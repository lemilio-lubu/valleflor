import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Variedad } from '../variedades/variedad.entity';

@Entity('productos')
@Unique('uq_producto_nombre', ['nombre'])
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'motivo_baja', type: 'text', nullable: true })
  motivoBaja: string | null;

  @OneToMany(() => Variedad, (variedad) => variedad.producto)
  variedades: Variedad[];

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.nombre) this.nombre = this.nombre.toUpperCase();
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
