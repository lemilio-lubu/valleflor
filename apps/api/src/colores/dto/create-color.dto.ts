import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateColorDto {
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsUUID()
  variedadId: string;

  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nombreComercial?: string | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  tallosPorCaja?: number;
}
