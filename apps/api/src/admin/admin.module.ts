import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Finca } from '../fincas/finca.entity';
import { User } from '../users/user.entity';
import { Responsable } from '../responsables/responsable.entity';
import { Producto } from '../productos/producto.entity';
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Finca,
      User,
      Responsable,
      Producto,
      Variedad,
      Color,
      ResponsableColor,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
