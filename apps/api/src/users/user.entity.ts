import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Finca } from '../fincas/finca.entity';
import { Responsable } from '../responsables/responsable.entity';

export enum UserRole {
  ADMIN = 'admin',
  RESPONSABLE = 'responsable',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: false })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  nombre: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESPONSABLE,
  })
  role: UserRole;

  @OneToMany(() => Finca, (finca) => finca.admin)
  fincas: Finca[];

  @OneToOne(() => Responsable, (responsable) => responsable.user)
  responsable: Responsable;

  @Column({ name: 'reset_password_token', type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamptz', nullable: true })
  resetPasswordExpires: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
