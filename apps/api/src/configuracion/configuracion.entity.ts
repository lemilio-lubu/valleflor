import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tallos_por_caja', type: 'int', default: 400 })
  tallosPorCaja: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
