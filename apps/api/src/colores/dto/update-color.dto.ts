import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateColorDto {
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(50)
  codigo?: string;

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
