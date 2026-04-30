export type UserRole = 'admin' | 'responsable';
export type DiaSemana = 'DOMINGO' | 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO';

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface IFinca {
  id: string;
  nombre: string;
  adminId: string;
}

export interface IResponsable {
  id: string;
  userId: string;
  fincaId: string;
  nombre: string;
}

export interface IProducto {
  id: string;
  fincaId: string;
  nombre: string; // siempre MAYUSCULAS
}

export interface IVariedad {
  id: string;
  productoId: string;
  nombre: string; // siempre MAYUSCULAS
}

export interface IColor {
  id: string;
  variedadId: string;
  nombre: string; // siempre MAYUSCULAS
}

export interface ISemana {
  id: string;
  numeroSemana: number;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  responsableId: string;
}

export interface IRegistroDiario {
  id: string;
  semanaId: string;
  colorId: string;
  dia: DiaSemana;
  fecha: string;
  cajas: number;
  divisorTallos: number;
  tallos: number;
  // relaciones expandidas
  color?: IColor & { variedad?: IVariedad & { producto?: IProducto } };
}

export interface IBaseSemanal {
  id: string;
  colorId: string;
  numeroSemana: number;
  anio: number;
  cajasTotal: number;
  tallosTotal: number;
  esReal: boolean;
}

export interface IVentaItem {
  producto: string;
  variedad: string;
  color: string;
  totalCajas: number;
  totalTallos: number;
}

export interface IBaseSemanalMatrizRow {
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  semanas: Record<string, { cajas: number; tallos: number; esReal: boolean }>;
}

// DTOs de request
export interface CreateProductoDto {
  nombre: string;
  fincaId: string;
}

export interface CreateVariedadDto {
  nombre: string;
  productoId: string;
}

export interface CreateColorDto {
  nombre: string;
  variedadId: string;
}

export interface CreateSemanaDto {
  numeroSemana: number;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface UpdateRegistroDto {
  cajas: number;
  divisorTallos?: number;
}

export interface UpdateRegistroResponse {
  data: IRegistroDiario;
  warning?: string;
}
