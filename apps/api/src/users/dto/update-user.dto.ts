import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsOptional()
  password?: string;

  @IsEnum(UserRole, { message: 'Rol inválido' })
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  fincaId?: string;
}
