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
}
