import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/user.entity';
import { Finca } from '../fincas/finca.entity';
import { Responsable } from '../responsables/responsable.entity';
import { Producto } from '../productos/producto.entity';
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
import { Semana } from '../semanas/semana.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'floricultura_db',
  entities: [
    User,
    Finca,
    Responsable,
    Producto,
    Variedad,
    Color,
    Semana,
    RegistroDiario,
    BaseSemanal,
  ],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
