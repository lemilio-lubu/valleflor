import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('divisores_estandar')
export class DivisorEstandar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'producto_nombre', type: 'varchar' })
  productoNombre: string;

  @Column({ name: 'variedad_nombre', type: 'varchar' })
  variedadNombre: string;

  @Column({ type: 'int' })
  divisor: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
