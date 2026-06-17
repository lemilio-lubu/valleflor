import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductoDto {
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  longitud?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  tallosPorCaja?: number;
}
