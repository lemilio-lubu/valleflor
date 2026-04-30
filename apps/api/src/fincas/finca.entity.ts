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
import { User } from '../users/user.entity';
import { Responsable } from '../responsables/responsable.entity';
import { Producto } from '../productos/producto.entity';

@Entity('fincas')
export class Finca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @Column({ name: 'admin_id' })
  adminId: string;

  @ManyToOne(() => User, (user) => user.fincas, { nullable: false })
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @OneToMany(() => Responsable, (responsable) => responsable.finca)
  responsables: Responsable[];

  @OneToMany(() => Producto, (producto) => producto.finca)
  productos: Producto[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
