import { Type } from 'class-transformer';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class CreateSemanaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  numeroSemana: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}
