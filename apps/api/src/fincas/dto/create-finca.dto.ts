import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFincaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  ubicacion?: string;
}
