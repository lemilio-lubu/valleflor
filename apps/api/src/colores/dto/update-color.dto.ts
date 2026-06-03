import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateColorDto {
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  tallosPorCaja?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  codigo?: string | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nombreOriginal?: string | null;
}
