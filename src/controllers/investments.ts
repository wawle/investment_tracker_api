import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset from "../models/Asset";
import { AssetType, Market } from "../utils/enums";
import { priceProvider } from "../utils/price-provider";

export const getInvestmentsByAccountId = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const assets = await Asset.find({ account: req.params.accountId }).select(
      "symbol avg_price amount market type"
    );

    // Group assets by type
    const groupedAssets = assets.reduce((acc: any, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = [];
      }
      acc[asset.type].push({
        symbol: asset.symbol,
        market: asset.market,
        avg_price: asset.avg_price,
        amount: asset.amount,
      });
      return acc;
    }, {});

    // Fetch prices for each asset type
    const assetPrices: { [key: string]: any[] } = {};

    // Fetch stock prices
    if (groupedAssets[AssetType.Stock]) {
      const stockInfos = groupedAssets[AssetType.Stock].map((item: any) => ({
        symbol: item.symbol,
        market: item.market,
      }));
      assetPrices[AssetType.Stock] = await fetchStockPrices(stockInfos);
    }

    // Fetch crypto prices (you would implement similar logic for different asset types)
    if (groupedAssets[AssetType.Crypto]) {
      const cryptoInfos = groupedAssets[AssetType.Crypto].map((item: any) => ({
        symbol: item.symbol,
        market: Market.Crypto,
      }));
      assetPrices[AssetType.Crypto] = await fetchStockPrices(cryptoInfos);
    }

    // // Fetch prices for other asset types here (e.g., Funds, Commodities)
    // // Example for fetching fund prices
    // if (groupedAssets[AssetType.Fund]) {
    //   const fundInfos = groupedAssets[AssetType.Fund].map((item) => ({
    //     symbol: item.symbol,
    //     market: item.market,
    //   }));
    //   assetPrices[AssetType.Fund] = await fetchFundPrices(fundInfos);
    // }

    // Calculate profit/loss for each asset type
    const investmentsWithProfitLoss: any = [];

    for (const assetType in groupedAssets) {
      const assetsByType = groupedAssets[assetType];
      const prices = assetPrices[assetType] || [];

      assetsByType.forEach((asset: any, index: number) => {
        const priceData = prices.find((price) => price.symbol === asset.symbol);
        if (priceData) {
          const currentPrice = parseFloat(
            priceData.currentPrice.replace(",", ".")
          );
          const profitLoss = Number(
            ((currentPrice - asset.avg_price) * asset.amount).toFixed(2)
          );
          const profitLossPercentage = Number(
            (
              ((currentPrice - asset.avg_price) / asset.avg_price) *
              100
            ).toFixed(2)
          );

          investmentsWithProfitLoss.push({
            type: assetType,
            symbol: asset.symbol,
            market: asset.market,
            avgPrice: asset.avg_price,
            amount: asset.amount,
            currentPrice,
            profitLoss,
            profitLossPercentage,
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      data: investmentsWithProfitLoss,
    });
  }
);

// export const getInvestmentsByAccountId = asyncHandler(
//   async (req: Request, res: Response, next: Function): Promise<void> => {
//     const assets = await Asset.find({ account: req.params.accountId }).select(
//       "symbol avg_price amount market type"
//     );
//     const assetInfos = assets.map((item) => ({
//       symbol: item.symbol,
//       market: item.market,
//     }));
//     const avg_prices = assets.map((item) => item.avg_price);
//     const amounts = assets.map((item) => item.amount);

//     // this example only for stock asset types. I wanna build for all asset types
//     const investments = await fetchStockPrices(assetInfos);

//     // Yatırımcıların kar/zararlarını hesaplıyoruz
//     const investmentsWithProfitLoss = investments.map((investment, index) => {
//       const avgPrice = avg_prices[index];
//       const amount = amounts[index];
//       const currentPrice = parseFloat(
//         investment.currentPrice.replace(",", ".")
//       );

//       // Kar/Zarar hesaplama
//       const profitLoss = Number(
//         ((currentPrice - avgPrice) * amount).toFixed(2)
//       );
//       const profitLossPercentage = Number(
//         (((currentPrice - avgPrice) / avgPrice) * 100).toFixed(2)
//       );

//       return {
//         ...investment,
//         currentPrice,
//         avgPrice,
//         amount,
//         profitLoss,
//         profitLossPercentage,
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: investmentsWithProfitLoss,
//     });
//   }
// );

export async function fetchStockPrices(
  assetInfos: { symbol: string; market: Market }[]
) {
  try {
    // Semboller virgülle ayrılmış şekilde birleştirilir

    const requests = assetInfos.map((item: any) =>
      priceProvider(item.market, item.symbol)
    );
    const responses = await Promise.all(requests);

    // Fiyat bilgilerini döndürelim
    const invenstments = responses.map((data: any, index) => {
      return {
        symbol: assetInfos[index].symbol,
        currentPrice: data[0].price,
      };
    });

    return invenstments;
  } catch (error) {
    console.error("Error fetching stock prices:", error);
    return [];
  }
}
