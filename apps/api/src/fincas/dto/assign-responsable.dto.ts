import { IsUUID } from 'class-validator';

export class AssignResponsableDto {
  @IsUUID()
  userId: string;
}
