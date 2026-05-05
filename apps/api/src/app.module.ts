import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseBootstrapService } from './database/database-bootstrap.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FincasModule } from './fincas/fincas.module';
import { ProductosModule } from './productos/productos.module';
import { VariedadesModule } from './variedades/variedades.module';
import { ColoresModule } from './colores/colores.module';
import { SemanasModule } from './semanas/semanas.module';
import { RegistrosModule } from './registros/registros.module';
import { BaseSemanalModule } from './base-semanal/base-semanal.module';
import { VentasModule } from './ventas/ventas.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') === 'development';
        return {
          type: 'postgres',
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port: config.get<number>('DATABASE_PORT', 5432),
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: config.get<string>('DATABASE_NAME', 'floricultura_db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: isDev,
          logging: isDev,
        };
      },
    }),
    AuthModule,
    UsersModule,
    FincasModule,
    ProductosModule,
    VariedadesModule,
    ColoresModule,
    SemanasModule,
    RegistrosModule,
    BaseSemanalModule,
    VentasModule,
    ConfiguracionModule,
    AdminModule,
  ],
  providers: [DatabaseBootstrapService],
})
export class AppModule {}
