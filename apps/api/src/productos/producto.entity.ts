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
import { Finca } from '../fincas/finca.entity';
import { Variedad } from '../variedades/variedad.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'finca_id' })
  fincaId: string;

  @ManyToOne(() => Finca, (finca) => finca.productos, { nullable: false })
  @JoinColumn({ name: 'finca_id' })
  finca: Finca;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @OneToMany(() => Variedad, (variedad) => variedad.producto)
  variedades: Variedad[];

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
