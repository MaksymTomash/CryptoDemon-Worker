import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Trade } from './trade.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(Trade) private repo: Repository<Trade>,
  ) {}

  async checkAndLiquidatetrades(): Promise<void> {
    const trades = await this.repo.find({
      where: { status: 'open' },
      relations: ['user', 'currency'],
    });
  
    for (const trade of trades) {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${trade.currency.symbol.toUpperCase()}USDT`);
      const data = await response.json();
      const currentPrice = parseFloat(data.price);
  
      const shouldLiquidate =
      (trade.type === 'buy' && currentPrice <= trade.liquidation_price) ||
      (trade.type === 'sell' && currentPrice >= trade.liquidation_price);

    if (shouldLiquidate) {
      trade.status = 'liquidated';
      trade.closed_at = new Date();
      const margin = parseFloat(trade.margin.toString());
      trade.fixed_user_profit = -parseFloat(margin.toFixed(8));
      trade.fixed_company_profit = 0;
      await this.repo.save(trade);
    }
    }
  }
}
