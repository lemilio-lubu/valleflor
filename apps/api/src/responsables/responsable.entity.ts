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
} from 'typeorm';
import { User } from '../users/user.entity';
import { Finca } from '../fincas/finca.entity';
import { Semana } from '../semanas/semana.entity';
import { ResponsableColor } from './responsable-color.entity';

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

  @OneToMany(() => Semana, (semana) => semana.responsable)
  semanas: Semana[];

  @OneToMany(() => ResponsableColor, (rc) => rc.responsable)
  coloresAsignados: ResponsableColor[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
