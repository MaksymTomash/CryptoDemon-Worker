import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PositionService } from './position/position.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const positionService = app.get(PositionService);

  console.log('🔄 Worker started...');

  while (true) {
    try {
      await positionService.checkAndLiquidatePositions(); // твоя логіка
    } catch (error) {
      console.error('❌ Error in worker:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // чекати 10 секунд
  }
}

bootstrap();