import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateColorDto {
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsUUID()
  variedadId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  tallosPorCaja?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  codigo?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  nombreOriginal?: string | null;
}
