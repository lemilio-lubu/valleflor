import { IsArray, IsOptional, IsUUID } from 'class-validator';

/**
 * Asignación granular (F4): el administrador puede asignar a un responsable
 * productos completos, variedades sueltas y/o colores sueltos. El servicio
 * expande la selección a los color_id activos correspondientes.
 */
export class SetAsignacionesDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productoIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  variedadIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  colorIds?: string[];
}
