import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCurrency } from './user-currency.entity';
import { UsersModule } from 'src/users/users.module';
import { CurrencyModule } from 'src/currency/currency.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserCurrency]),UsersModule, CurrencyModule],
  providers: [],
  exports: [],
})
export class UserCurrencyModule {}
