import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { TradeModule } from './trade/trade.module';
import { UsersModule } from './users/users.module';
import { CurrencyModule } from './currency/currency.module';
import { UserCurrencyModule } from './user-currency/user-currency.module';

@Module({
  imports: [ConfigModule.forRoot(),
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: true,
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }), UsersModule, TradeModule, CurrencyModule, UserCurrencyModule,
    ],
  controllers: [AppController],
  providers: [AppService, TradeModule],
})
export class AppModule {}
