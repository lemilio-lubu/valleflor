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
import { Producto } from '../productos/producto.entity';

@Entity('responsable_productos')
@Unique(['responsableId', 'productoId'])
export class ResponsableProducto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'responsable_id' })
  responsableId: string;

  @ManyToOne(() => Responsable, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Responsable;

  @Column({ name: 'producto_id' })
  productoId: string;

  @ManyToOne(() => Producto, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
