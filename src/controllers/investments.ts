import asyncHandler from '../middleware/async';
import { NextFunction, Request, Response } from 'express';
import Asset from '../models/Asset';
import { Market } from '../utils/enums';
import { priceProvider } from '../utils/price-provider';

export const getInvestmentsByAccountId = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const assets = (await Asset.find({account: req.params.accountId}).select("symbol avg_price amount market"))
    const assetInfos = assets.map((item) => ({symbol: item.symbol,market: Market.Bist100}));
    const avg_prices = assets.map((item) => item.avg_price);
    const amounts = assets.map((item) => item.amount);

  
    const investments = await fetchStockPrices(assetInfos);

     // Yatırımcıların kar/zararlarını hesaplıyoruz
     const investmentsWithProfitLoss = investments.map((investment, index) => {
      const avgPrice = avg_prices[index];
      const amount = amounts[index];
      const currentPrice = parseFloat(investment.currentPrice.replace(',', '.')); 


      // Kar/Zarar hesaplama
      const profitLoss = Number(((currentPrice - avgPrice) * amount).toFixed(2));
      const profitLossPercentage = Number((((currentPrice - avgPrice) / avgPrice) * 100).toFixed(2));

      return {
          ...investment,
          currentPrice,
          avgPrice,
          amount,
          profitLoss,
          profitLossPercentage
      };
  });
  
      res.status(200).json({
          success: true,
          data: investmentsWithProfitLoss
        });
    });



// Finnhub API'sine birden fazla sembol ile tek seferde istek gönder
export async function fetchStockPrices(assetInfos: {symbol: string,market: Market}[]) {
    try {
      // Semboller virgülle ayrılmış şekilde birleştirilir
     
      const requests = assetInfos.map((item:any) => priceProvider(item.market, item.symbol))
      const responses = await Promise.all(requests);

      
      // Fiyat bilgilerini döndürelim
      const invenstments = responses.map((data:any, index) => {
        return {
          symbol: assetInfos[index].symbol,
          currentPrice: data[0].price,
        }
      });

      return invenstments;
    } catch (error) {
      console.error("Error fetching stock prices:", error);
      return [];
    }
  }

 