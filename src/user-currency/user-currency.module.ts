import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCurrency } from './user-currency.entity';
import { UsersModule } from '../users/users.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserCurrency]),UsersModule, CurrencyModule],
  providers: [],
  exports: [],
})
export class UserCurrencyModule {}
