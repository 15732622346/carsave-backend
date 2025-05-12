import * as dotenv from 'dotenv';
import * as path from 'path';
// 在应用启动前直接加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.development') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // 打印环境变量，用于调试
  logger.log(`环境变量检查 - DB_HOST: ${process.env.DB_HOST}`);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  logger.log('Setting up global prefix...');
  app.setGlobalPrefix('api');

  logger.log('Enabling CORS...');
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  logger.log('Setting up global pipes...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
