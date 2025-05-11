import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Trade } from './trade.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    @InjectRepository(Trade) private repo: Repository<Trade>,
  ) {}

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
        this.logger.error(`Failed to fetch price for ${symbol}: ${error.message}`);
        continue;
      }

      if (!response.ok) {
        this.logger.warn(`Non-OK response for ${symbol}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const currentPrice = parseFloat(data.price);
      if (isNaN(currentPrice)) {
        this.logger.warn(`Invalid price received for ${symbol}`);
        continue;
      }

      const margin = parseFloat(trade.margin?.toString() || '0');
      if (!margin || !trade.bought_at_price) {
        this.logger.warn(`Trade ${trade.id} has no valid margin or bought_at_price`);
        continue;
      }

      let shouldClose = false;
      let closeType: 'closed' | 'liquidated' | null = null;

      if (
        trade.liquidation_price &&
        (
          (trade.type === 'buy' && currentPrice <= trade.liquidation_price) ||
          (trade.type === 'sell' && currentPrice >= trade.liquidation_price)
        )
      ) {
        shouldClose = true;
        closeType = 'liquidated';
        trade.fixed_user_profit = -margin;
      }
      else if (
        trade.TP_price &&
        (
          (trade.type === 'buy' && currentPrice >= trade.TP_price) ||
          (trade.type === 'sell' && currentPrice <= trade.TP_price)
        )
      ) {
        shouldClose = true;
        closeType = 'closed';
        trade.fixed_user_profit = parseFloat(
          ((currentPrice - trade.bought_at_price) * margin / trade.bought_at_price).toFixed(8)
        );
      }
      else if (
        trade.SL_price &&
        (
          (trade.type === 'buy' && currentPrice <= trade.SL_price) ||
          (trade.type === 'sell' && currentPrice >= trade.SL_price)
        )
      ) {
        shouldClose = true;
        closeType = 'closed';
        trade.fixed_user_profit = -margin;
      }

      if (shouldClose && closeType) {
        trade.status = closeType;
        trade.closed_at = new Date();
        trade.closing_price = currentPrice;
        trade.fixed_company_profit = 0;

        await this.repo.save(trade);
        this.logger.log(`Trade ${trade.id} closed as ${closeType} at ${currentPrice}`);
      }
    }
  }
}
