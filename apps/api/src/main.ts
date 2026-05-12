import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || (!isProduction && process.env.SWAGGER_ENABLED !== 'false');

  if (swaggerEnabled) {
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Valleflor API')
      .setDescription('Documentacion de la API de Valleflor para autenticacion y gestion operativa.')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';
    console.log(`Swagger running on http://localhost:${port}/${swaggerPath}`);
  }
}

bootstrap();
