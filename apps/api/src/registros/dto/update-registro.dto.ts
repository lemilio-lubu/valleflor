import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRegistroDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cajas: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  divisorTallos?: number;
}
