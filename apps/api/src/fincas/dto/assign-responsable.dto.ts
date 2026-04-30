import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignResponsableDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
