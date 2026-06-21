import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Acciones auditables del sistema. Se guardan como texto (no enum de Postgres)
 * para evitar migraciones de tipo y mantener legible la auditoría.
 */
export const AccionAuditoria = {
  CREACION: 'Creación',
  EDICION: 'Edición',
  BAJA: 'Baja',
  ASIGNACION_RESPONSABLE: 'Asignación de responsable',
  CARGA_MASIVA: 'Carga masiva',
  INICIO_SESION: 'Inicio de sesión',
} as const;
export type AccionAuditoria =
  (typeof AccionAuditoria)[keyof typeof AccionAuditoria];

/** Módulos del portal de administración cubiertos por la auditoría. */
export const ModuloAuditoria = {
  FINCAS: 'fincas',
  USUARIOS: 'usuarios',
  CATALOGO: 'catálogo',
  // Apartado propio para los inicios de sesión, separado del historial de cambios.
  ACCESOS: 'accesos',
} as const;
export type ModuloAuditoria =
  (typeof ModuloAuditoria)[keyof typeof ModuloAuditoria];

@Entity('movimientos_auditoria')
export class MovimientoAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Autor de la acción. Nullable porque el usuario podría borrarse luego; el
  // nombre se desnormaliza en actor_nombre para que el historial sobreviva.
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Index()
  @Column({ name: 'actor_nombre', type: 'varchar' })
  actorNombre: string;

  @Index()
  @Column({ type: 'varchar' })
  accion: string;

  @Index()
  @Column({ type: 'varchar' })
  modulo: string;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior: string | null;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo: string | null;

  // Momento del movimiento. Se fija con clock.now() para ser determinista en
  // pruebas (retención). Indexado: las consultas ordenan y filtran por fecha.
  @Index()
  @Column({ name: 'fecha', type: 'timestamptz' })
  fecha: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
