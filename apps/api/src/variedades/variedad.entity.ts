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
import { Producto } from '../productos/producto.entity';
import { Color } from '../colores/color.entity';

@Entity('variedades')
@Unique('uq_variedad_nombre_producto', ['productoId', 'nombre'])
export class Variedad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'producto_id' })
  productoId: string;

  @ManyToOne(() => Producto, (producto) => producto.variedades, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Color, (color) => color.variedad)
  colores: Color[];

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
