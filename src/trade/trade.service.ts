import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Trade } from './trade.entity';
import { Repository } from 'typeorm';
import { UserCurrencyService } from '../user-currency/user-currency.service';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    @InjectRepository(Trade) private repo: Repository<Trade>,
    private userCurrencyService: UserCurrencyService,
  ) {}


  async close(trade: Trade, exitPrice: number){
    const positionSize = parseFloat(trade.margin.toString()) * parseFloat(trade.leverage.toString());
    let profit = 0;
    if (trade.type === 'buy') {
      profit = (exitPrice - trade.bought_at_price) * (positionSize / trade.bought_at_price);
    } else {
      profit = (trade.bought_at_price - exitPrice) * (positionSize / trade.bought_at_price);
    }

    let companyCommission = 0;
    if (profit > 0) {
      companyCommission = parseFloat((profit * 0.05).toFixed(8));
    }
    const userProfit = parseFloat((profit > 0 ? profit - companyCommission : profit).toFixed(8));

    trade.fixed_company_profit = companyCommission;
    trade.fixed_user_profit = userProfit;
    trade.status = 'closed';
    trade.closing_price = exitPrice;
    trade.closed_at = new Date();

    const usdtBalance = await this.userCurrencyService.getOne(trade.user.firebaseUid, 'USDT');
    const amountToReturn = parseFloat(trade.margin.toString()) + parseFloat(profit.toString());
    await this.userCurrencyService.setBalance(trade.user.firebaseUid, 'USDT', usdtBalance.balance + amountToReturn);

    return await this.repo.save(trade);
  }


  async liquidateTrade(trade: Trade, exitPrice: number): Promise<Trade> {
    trade.status = 'liquidated';
    trade.closed_at = new Date();
    trade.fixed_user_profit = -parseFloat((trade.margin).toString());
    trade.fixed_company_profit = 0;
    trade.closing_price = exitPrice;
    return await this.repo.save(trade);
  }
  
  async checkAndCloseTrades(): Promise<void> {
    const trades = await this.repo.find({
      where: { status: 'open' },
      relations: ['user', 'currency'],
    });
  
    for (const trade of trades) {
      const symbol = `${trade.currency.symbol.toUpperCase()}USDT`;
  
      let response;
      try {
        response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      } catch (error) {
        this.logger?.error?.(`Failed to fetch price for ${symbol}: ${error.message}`);
        continue;
      }
  
      if (!response.ok) {
        this.logger?.warn?.(`Non-OK response for ${symbol}: ${response.statusText}`);
        continue;
      }
  
      const data = await response.json();
      const currentPrice = parseFloat(data.price);
      if (isNaN(currentPrice)) {
        this.logger?.warn?.(`Invalid price received for ${symbol}`);
        continue;
      }
      if (
        trade.liquidation_price &&
        (
          (trade.type === 'buy' && currentPrice <= trade.liquidation_price) ||
          (trade.type === 'sell' && currentPrice >= trade.liquidation_price)
        )
      ) {
        await this.liquidateTrade(trade, currentPrice);
        this.logger?.log?.(`Trade ${trade.id} liquidated at ${currentPrice}`);
        continue;
      }
      if (
        trade.TP_price &&
        (
          (trade.type === 'buy' && currentPrice >= trade.TP_price) ||
          (trade.type === 'sell' && currentPrice <= trade.TP_price)
        )
      ) {
        await this.close(trade, currentPrice);
        this.logger?.log?.(`Trade ${trade.id} closed by TP at ${currentPrice}`);
        continue;
      }
      if (
        trade.SL_price &&
        (
          (trade.type === 'buy' && currentPrice <= trade.SL_price) ||
          (trade.type === 'sell' && currentPrice >= trade.SL_price)
        )
      ) {
        await this.close(trade, currentPrice);
        this.logger?.log?.(`Trade ${trade.id} closed by SL at ${currentPrice}`);
        continue;
      }
    }
  }
}
