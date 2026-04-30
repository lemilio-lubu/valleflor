import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Finca } from '../fincas/finca.entity';
import { Semana } from '../semanas/semana.entity';

@Entity('responsables')
export class Responsable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.responsable, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'finca_id' })
  fincaId: string;

  @ManyToOne(() => Finca, (finca) => finca.responsables, { nullable: false })
  @JoinColumn({ name: 'finca_id' })
  finca: Finca;

  @Column({ type: 'varchar', nullable: false })
  nombre: string;

  @OneToMany(() => Semana, (semana) => semana.responsable)
  semanas: Semana[];

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
