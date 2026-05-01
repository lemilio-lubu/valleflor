import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Responsable } from '../responsables/responsable.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Responsable)
    private readonly respRepo: Repository<Responsable>,
  ) {}

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.userRepo.find({ relations: ['responsable'] });
    return users.map(({ passwordHash: _, ...u }) => u as Omit<User, 'passwordHash'>);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: ['responsable', 'responsable.finca'],
    });
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.userRepo.count({ where: { role } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Ya existe un usuario con email ${dto.email}`);
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    
    // Create user and responsable in a transaction if possible, or sequentially
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role ?? UserRole.RESPONSABLE,
      nombre: dto.nombre ? dto.nombre.toUpperCase().trim() : null,
    });

    const savedUser = await this.userRepo.save(user);

    if (savedUser.role === UserRole.RESPONSABLE && dto.fincaId) {
      const resp = this.respRepo.create({
        userId: savedUser.id,
        fincaId: dto.fincaId,
      });
      await this.respRepo.save(resp);
    }

    return savedUser;
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(`Ya existe un usuario con email ${dto.email}`);
      }
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.role) {
      user.role = dto.role;
    }

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.respRepo.delete({ userId: id });
    await this.userRepo.remove(user);
  }

  async updateProfile(
    userId: string,
    dto: { email?: string; currentPassword?: string; password?: string; nombre?: string },
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findOne(userId);
    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException(`Ya existe un usuario con email ${dto.email}`);
      user.email = dto.email;
    }
    if (dto.password) {
      const valid = await bcrypt.compare(dto.currentPassword ?? '', user.passwordHash);
      if (!valid) throw new ConflictException('La contraseña actual es incorrecta');
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    if (dto.nombre) {
      user.nombre = dto.nombre.toUpperCase().trim();
    }
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe as Omit<User, 'passwordHash'>;
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetPasswordToken: token } });
  }

  async setResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userRepo.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.update(userId, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
