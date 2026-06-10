import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // API Prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allowed Origins
  const allowedOrigins: string[] = [
    'http://localhost:5173',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  if (process.env.FRONTEND_URL_2) {
    allowedOrigins.push(process.env.FRONTEND_URL_2);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Static uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Render uses PORT automatically
  const port = Number(process.env.PORT) || 5000;

  await app.listen(port);

  console.log(`
=================================================
🚀 BuildPro IMS API Started
🌍 Environment : ${process.env.NODE_ENV || 'development'}
🔗 Port        : ${port}
📁 Uploads     : /uploads
📡 API Prefix  : /api
=================================================
`);
}

bootstrap();