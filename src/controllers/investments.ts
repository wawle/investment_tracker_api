import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset, { IAsset } from "../models/Asset";
import { AssetType, Currency, Market } from "../utils/enums";
import { priceProvider } from "../utils/price-provider";
import { fetchExchange, getCurrencyConversionRate } from "./exchange";
import { fetchUsaStocks } from "./stocks";
import { scrapeGoldPrices } from "./commodity";
import { convertToNumber, roundToTwoDecimalPlaces } from "../utils";
import { fetchFunds } from "./funds";

// @desc      Get all investments by account Id
// @route     GET /api/v1/investments/:accountId
// @access    Public
export const getInvestmentsByAccountId = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { accountId } = req.params;
    const { currency = "usd" } = req.query;

    // Step 1: Retrieve all assets for the given accountId
    const assets = await Asset.find({
      account: accountId,
    })
      .select("symbol avg_price amount type currency")
      .lean();

    // Step 2: Group assets by type
    const groupedAssets: IGroupedAssets = {
      crypto: [],
      usaStocks: [],
      trStocks: [],
      commodities: [],
      exchanges: [],
      funds: [],
    };

    assets.forEach((asset) => {
      if (asset.type === AssetType.Crypto) groupedAssets.crypto.push(asset);
      if (asset.type === AssetType.Stock && asset.currency === Currency.USD)
        groupedAssets.usaStocks.push(asset);
      if (asset.type === AssetType.Stock && asset.currency === Currency.TRY)
        groupedAssets.trStocks.push(asset);
      if (asset.type === AssetType.Commodity)
        groupedAssets.commodities.push(asset);
      if (asset.type === AssetType.Exchange)
        groupedAssets.exchanges.push(asset);
      if (asset.type === AssetType.Fund) groupedAssets.funds.push(asset);
    });

    // Step 3: Fetch prices for each asset type
    const pricePromises = [];

    if (groupedAssets.crypto.length)
      pricePromises.push(
        fetchCryptoPrices(groupedAssets.crypto, currency as Currency)
      );
    if (groupedAssets.usaStocks.length)
      pricePromises.push(
        fetchUsaStockPrices(groupedAssets.usaStocks, currency as Currency)
      );
    if (groupedAssets.trStocks.length)
      pricePromises.push(
        fetchTrStockPrices(groupedAssets.trStocks, currency as Currency)
      );
    if (groupedAssets.commodities.length)
      pricePromises.push(
        fetchCommodityPrices(groupedAssets.commodities, currency as Currency)
      );
    if (groupedAssets.exchanges.length)
      pricePromises.push(
        fetchExchangePrices(groupedAssets.exchanges, currency as Currency)
      );
    if (groupedAssets.funds.length)
      pricePromises.push(
        fetchFundPrices(groupedAssets.funds, currency as Currency)
      );

    // Wait for all price fetches to complete
    const priceResults: any = await Promise.all(pricePromises);

    const [
      cryptoPrices = [],
      usaStockPrices = [],
      trStockPrices = [],
      commodityPrices = [],
      exchangePrices = [],
      fundPrices = [],
    ] = priceResults;

    // Step 4: Calculate profit/loss for each asset type and populate the result
    const investmentsWithProfitLoss: IGroupedInvestments = {
      crypto: cryptoPrices,
      usaStocks: usaStockPrices,
      trStocks: trStockPrices,
      commodities: commodityPrices,
      exchanges: exchangePrices,
      funds: fundPrices,
    };

    const data = calculateBalances(investmentsWithProfitLoss);

    res.status(200).json({
      success: true,
      data,
    });
  }
);

// Get total balance grouped by type
function calculateBalances(data: any) {
  const result: any = {};
  let globalTotalBalance = 0;
  let globalTotalProfitLoss = 0;
  let globalTotalProfitLossPercentage = 0;
  let globalCount = 0;

  // Iterate through each type (crypto, stocks, commodities, etc.)
  Object.keys(data).forEach((type) => {
    const assets = data[type];

    // If there are no assets of this type, skip it
    if (assets.length === 0) {
      return; // Skip empty arrays (e.g., no crypto, no stocks)
    }

    let totalBalance = 0;
    let totalProfitLoss = 0;
    let totalProfitLossPercentage = 0;
    let count = 0;

    // Iterate over each asset to calculate totals and profits
    assets.forEach((asset: IInvestmentWithProfitLoss) => {
      const { amount, currentPrice, profitLoss, profitLossPercentage } = asset;

      // Calculate totalBalance for this asset
      const balance = amount * currentPrice;
      totalBalance += balance;

      // Calculate total profit/loss and profitLossPercentage
      totalProfitLoss += profitLoss;

      // Average profitLossPercentage across all assets of this type
      totalProfitLossPercentage += profitLossPercentage;
      count++;

      // Update global totals
      globalTotalBalance += balance;
      globalTotalProfitLoss += profitLoss;
      globalTotalProfitLossPercentage += profitLossPercentage;
      globalCount++;
    });

    if (count > 0) {
      // Calculate average profitLossPercentage for the type
      totalProfitLossPercentage /= count;
    }

    // Store the results for this type (both data and total)
    result[type] = {
      assets: assets, // List of assets
      total: {
        balance: roundToTwoDecimalPlaces(totalBalance),
        profitLoss: roundToTwoDecimalPlaces(totalProfitLoss),
        profitLossPercentage: roundToTwoDecimalPlaces(
          totalProfitLossPercentage
        ),
      },
    };
  });

  // Calculate the global total (across all asset types)
  const globalProfitLossPercentage =
    globalCount > 0 ? globalTotalProfitLossPercentage / globalCount : 0;

  // Add the global total
  result.total = {
    balance: roundToTwoDecimalPlaces(globalTotalBalance),
    profitLoss: roundToTwoDecimalPlaces(globalTotalProfitLoss),
    profitLossPercentage: roundToTwoDecimalPlaces(globalProfitLossPercentage),
  };

  return result;
}

// Define the structure for the profit/loss data
interface IInvestmentWithProfitLoss {
  symbol: string;
  type: AssetType;
  avgPrice: number;
  amount: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

// Define a result object grouped by asset type
interface IGroupedAssets {
  crypto: any[];
  usaStocks: any[];
  trStocks: any[];
  commodities: any[];
  exchanges: any[];
  funds: any[];
}

// Define a result object grouped by asset type
interface IGroupedInvestments {
  crypto: IInvestmentWithProfitLoss[];
  usaStocks: IInvestmentWithProfitLoss[];
  trStocks: IInvestmentWithProfitLoss[];
  commodities: IInvestmentWithProfitLoss[];
  exchanges: IInvestmentWithProfitLoss[];
  funds: IInvestmentWithProfitLoss[];
}

const fetchCryptoPrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.USD;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const crypto = await priceProvider(Market.Crypto, "");

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { price, icon, name }: any = crypto.find(
      (item) => item.ticker === asset.symbol
    );

    let currentPrice = parseFloat(price.replace(/,/g, ""));
    const { avg_price, amount, type, symbol } = asset;

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      icon,
      name,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};

const fetchUsaStockPrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.USD;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const usaStocks = await fetchUsaStocks();

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { price, icon, name }: any = usaStocks.find(
      (item) => item.ticker === asset.symbol
    );

    let currentPrice = parseFloat(price);
    const { avg_price, amount, type, symbol } = asset;

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      icon,
      name,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};

const fetchTrStockPrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.TRY;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const trStocks = await priceProvider(Market.Bist100, "");

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { price, icon, name }: any = trStocks.find(
      (item) => item.ticker === asset.symbol
    );

    let currentPrice = parseFloat(price);
    const { avg_price, amount, type, symbol } = asset;

    console.log({ conversionRate, avg_price });

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      icon,
      name,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};

const fetchCommodityPrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.TRY;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const commodities = await scrapeGoldPrices();

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { price, name }: any = commodities.find(
      (item) => item.code === asset.symbol
    );

    let currentPrice = convertToNumber(price);
    const { avg_price, amount, type, symbol } = asset;

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      name,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};

const fetchExchangePrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.TRY;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const exchanges = await fetchExchange();

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { sell, name }: any = exchanges.find(
      (item) => item.code === asset.symbol
    );

    let currentPrice = parseFloat(sell);
    const { avg_price, amount, type, symbol } = asset;

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      name,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};

const fetchFundPrices = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<IInvestmentWithProfitLoss[]> => {
  const fromCurrency = assets[0].currency || Currency.TRY;
  const conversionRate = await getCurrencyConversionRate(
    fromCurrency,
    targetCurrency
  );

  const funds = await fetchFunds();

  // Fiyat bilgilerini döndürelim
  return assets.map((asset) => {
    let { fundName, price }: any = funds.find(
      (item) => item.fundCode === asset.symbol
    );

    let currentPrice = convertToNumber(price);
    const { avg_price, amount, type, symbol } = asset;

    // Convert the current price and avg price to the target currency
    currentPrice = roundToTwoDecimalPlaces(currentPrice * conversionRate);
    const avgPrice = roundToTwoDecimalPlaces(avg_price * conversionRate);
    return {
      name: fundName,
      symbol,
      amount,
      type,
      currency: targetCurrency, // Change the currency to the target
      currentPrice: roundToTwoDecimalPlaces(currentPrice),
      avgPrice: roundToTwoDecimalPlaces(avgPrice),
      profitLoss: roundToTwoDecimalPlaces((currentPrice - avgPrice) * amount),
      profitLossPercentage: roundToTwoDecimalPlaces(
        ((currentPrice - avgPrice) / avgPrice) * 100
      ),
    };
  });
};
