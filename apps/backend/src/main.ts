import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Sally API')
    .setDescription('Sally API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  const url = await app.getUrl();
  console.log(`Server running on: ${url}`);
  console.log(`Swagger UI: ${url}/api`);
}
bootstrap();