import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './currency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  providers: [],
  exports: [],
})
export class CurrencyModule {}
