import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttpApp(app);
  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();
