import cluster from 'cluster';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'https://smart-pos-frontend-gamma.vercel.app'
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

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

// Cluster Logic for Auto-Restart
if ((cluster as any).isPrimary || (cluster as any).isMaster) {
  console.log(`Primary ${process.pid} is running`);

  // Fork initial worker
  (cluster as any).fork();

  // Handle worker death
  (cluster as any).on('exit', (worker: any, code: any, signal: any) => {
    console.log(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}).`);
    console.log('Restarting server in 10 seconds...');

    setTimeout(() => {
      console.log('Spawning new worker...');
      (cluster as any).fork();
    }, 10000); // 10 seconds delay
  });
} else {
  // Workers invoke bootstrap
  bootstrap();
}
