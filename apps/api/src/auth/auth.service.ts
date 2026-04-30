import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';

export interface AuthPayload {
  accessToken: string;
  user: { id: string; email: string; role: UserRole; nombre?: string | null; fincaId?: string; fincaNombre?: string; responsableNombre?: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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
        nombre: user.nombre ?? user.responsable?.nombre ?? null,
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Respuesta genérica para no revelar si el email existe
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await this.usersService.setResetToken(user.id, token, expires);
    await this.mailService.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user || !user.resetPasswordExpires) {
      throw new BadRequestException('Token inválido o expirado');
    }
    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('El enlace de recuperación ha expirado');
    }
    await this.usersService.resetPassword(user.id, newPassword);
  }

  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    return safe as Omit<User, 'passwordHash'>;
  }

  async updateProfile(userId: string, dto: { email?: string; password?: string; nombre?: string }) {
    return this.usersService.updateProfile(userId, dto);
  }
}
