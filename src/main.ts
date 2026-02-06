import cluster from 'cluster';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'https://smart-pos-frontend-gamma.vercel.app'
      ];

      const isAllowed = allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        /^http:\/\/localhost:\d+$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Global prefix
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Cookie Parser
  // Note: We need to import cookie-parser. Using require to avoid import errors if types are missing initially.
  app.use(require('cookie-parser')());

  // Global Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend is running on: http://localhost:${port}/api`);
}

bootstrap();
