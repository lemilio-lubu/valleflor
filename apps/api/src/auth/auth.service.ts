import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';

export interface AuthPayload {
  accessToken: string;
  user: { id: string; email: string; role: UserRole; fincaId?: string; fincaNombre?: string; responsableNombre?: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  login(user: User): AuthPayload {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        ...(user.responsable?.fincaId && { fincaId: user.responsable.fincaId }),
        ...(user.responsable?.finca?.nombre && { fincaNombre: user.responsable.finca.nombre }),
        ...(user.responsable?.nombre && { responsableNombre: user.responsable.nombre }),
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthPayload> {
    const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
    if (adminCount > 0) {
      throw new ForbiddenException(
        'Ya existe un administrador. Usa POST /users con credenciales de admin.',
      );
    }
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      role: UserRole.ADMIN,
    });
    return this.login(user);
  }

  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    return safe as Omit<User, 'passwordHash'>;
  }
}
