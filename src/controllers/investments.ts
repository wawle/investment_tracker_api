import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset, { IAsset } from "../models/Asset";
import { AssetMarket, Currency } from "../utils/enums";
import { roundToTwoDecimalPlaces } from "../utils";
import Investment from "../models/Investment";
import ErrorResponse from "../utils/errorResponse";
import History from "../models/History";

// Define the structure for the profit/loss data
export interface IInvestmentWithProfitLoss {
  assetId: string;
  ticker: string;
  market: AssetMarket;
  name: string;
  icon?: string;
  avgPrice: number;
  amount: number;
  currentPrice: number;
  balance: number;
  profitLoss: number;
  profitLossPercentage: number;
}

// Function to fetch investment prices with range-based calculations
export const fetchInvestmentPrices = async (
  investments: any[],
  targetCurrency: Currency,
  range: "daily" | "weekly" | "monthly" | "all"
) => {
  const investmentDetails = [];
  const totalProfitLossByMarket: Record<string, number> = {};
  const totalValueByMarket: Record<string, number> = {}; // Total value for each market type
  const totalAmountByMarket: Record<string, number> = {}; // Total amount for each market type

  // Create a set of asset IDs from the investments to reduce database queries
  const assetIds = Array.from(
    new Set(investments.map((investment) => investment.asset._id.toString()))
  );

  // Fetch all asset details in parallel (reduce redundant queries)
  const assets = await Asset.find({ _id: { $in: assetIds } });

  // Fetch conversion rates for the target currency and all relevant currencies at once
  const conversionRates = await fetchConversionRatesForAssets(targetCurrency);

  // Determine the date range based on the range parameter
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case "daily":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "weekly":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "monthly":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "all":
    default:
      startDate = new Date(0); // Epoch time
      break;
  }

  // Loop through all investments and calculate details
  for (const investment of investments) {
    const { asset, amount, avg_price } = investment;

    // Get the asset details from the fetched assets array
    const assetDetails = assets.find(
      (a) => a._id.toString() === asset._id.toString()
    );

    if (!assetDetails) {
      console.error(`No asset found for symbol: ${asset.ticker}`);
      continue;
    }

    const { price: currentPrice, market, currency } = assetDetails;

    // Get the conversion rate from the cache (conversionRates already contain rates for TRY, USD, EUR)
    const assetConversionRate = conversionRates[currency];

    // Convert the current price based on the conversion rate (converting to the target currency)
    const convertedCurrentPrice = currentPrice[currency] * assetConversionRate;

    // Convert avg_price as well
    const convertedAvgPrice = avg_price * assetConversionRate;

    // Fetch historical prices for range calculations
    const histories = await History.find({
      asset: asset._id,
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: 1 });

    // Use the first and last historical prices in the range
    const startPrice = histories.length
      ? histories[0].close_price[targetCurrency] || convertedAvgPrice
      : convertedAvgPrice;

    const endPrice =
      histories.length > 0
        ? histories[histories.length - 1].close_price[targetCurrency] ||
          convertedCurrentPrice
        : convertedCurrentPrice;

    // Calculate balance and profit/loss in the target currency
    const balance = amount * endPrice;
    const profitLoss = balance - amount * startPrice;
    const profitLossPercentage = (profitLoss / (amount * startPrice)) * 100;

    // Prepare the result for this investment
    investmentDetails.push({
      assetId: asset.id,
      ticker: asset.ticker,
      market: market,
      icon: asset.icon,
      name: asset.name,
      avgPrice: roundToTwoDecimalPlaces(convertedAvgPrice),
      amount,
      currentPrice: roundToTwoDecimalPlaces(endPrice),
      balance: roundToTwoDecimalPlaces(balance),
      profitLoss: roundToTwoDecimalPlaces(profitLoss),
      profitLossPercentage: roundToTwoDecimalPlaces(profitLossPercentage),
    });

    // Aggregate total profit/loss, value, and amount by market type
    if (!totalProfitLossByMarket[market]) {
      totalProfitLossByMarket[market] = 0;
      totalValueByMarket[market] = 0;
      totalAmountByMarket[market] = 0;
    }

    totalProfitLossByMarket[market] += profitLoss;
    totalValueByMarket[market] += balance; // Add current balance to total value
    totalAmountByMarket[market] += amount; // Add amount to total amount
  }

  return {
    investmentDetails,
    totalProfitLossByMarket,
    totalValueByMarket,
    totalAmountByMarket,
  };
};

// Fetch conversion rates for assets and set prices
export const updateAssetPricesWithConversion = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<void> => {
  // Fetch conversion rates for all currencies
  const conversionRates = await fetchConversionRatesForAssets(targetCurrency);

  // Update the price field for each asset
  await Promise.all(
    assets.map(async (asset) => {
      const basePrice = asset.price[targetCurrency]; // Get base price in target currency
      const updatedPrice = {
        [Currency.TRY]: basePrice * (1 / conversionRates[Currency.TRY] || 1),
        [Currency.USD]: basePrice * (1 / conversionRates[Currency.USD] || 1),
        [Currency.EUR]: basePrice * (1 / conversionRates[Currency.EUR] || 1),
      };

      await Asset.findOneAndUpdate(
        { _id: asset._id },
        { price: updatedPrice, scrapedAt: new Date() },
        { new: true }
      );
    })
  );
};

export const fetchConversionRatesForAssets = async (
  fromCurrency: Currency
): Promise<{ [currency: string]: number }> => {
  // Extract all unique currencies used in the assets
  const currencies = Array.from(new Set(Object.keys(Currency)));

  // Fetch conversion rates for all currencies at once
  const conversionPromises = currencies.map((currency) =>
    getCurrencyConversionRate(currency, fromCurrency)
  );
  const conversionRates = await Promise.all(conversionPromises);

  // Map currencies to their conversion rates
  const rates: { [currency: string]: number } = {};
  currencies.forEach((currency, index) => {
    rates[currency] = conversionRates[index];
  });

  console.log({ rates, fromCurrency });

  return rates;
};

export const getCurrencyConversionRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) return 1;

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  if (conversionRateCache[cacheKey]) {
    console.log("Cache hit for", cacheKey);
    return conversionRateCache[cacheKey];
  }

  let conversionRate: number;

  try {
    const fromAsset = await Asset.findOne({
      ticker: fromCurrency,
      market: AssetMarket.Exchange,
    });
    const toAsset = await Asset.findOne({
      ticker: toCurrency,
      market: AssetMarket.Exchange,
    });

    console.log({ fromCurrency, toCurrency, fromAsset, toAsset });

    if (fromAsset && toAsset) {
      conversionRate =
        fromAsset.price[Currency.TRY] / toAsset.price[Currency.TRY];
    } else {
      throw new Error(
        `Conversion rate not found for ${fromCurrency} or ${toCurrency} in TRY`
      );
    }
  } catch (error: any) {
    console.error(`Error fetching conversion rate: ${error?.message}`);
    throw error;
  }

  conversionRateCache[cacheKey] = conversionRate;
  return conversionRate;
};

// In-memory cache for storing conversion rates
const conversionRateCache: { [key: string]: number } = {};

const groupInvestmentsByMarket = (
  investmentPrices: IInvestmentWithProfitLoss[],
  totalProfitLossByMarket: { [market: string]: number },
  totalValueByMarket: { [market: string]: number }
) => {
  const groupedInvestments: {
    [key: string]: {
      investments: IInvestmentWithProfitLoss[];
      totalProfitLoss: number;
      totalProfitLossPercentage: number;
      totalBalance: number; // Track total balance by market
    };
  } = {};

  investmentPrices.forEach((investment) => {
    const marketType = investment.market;

    // Initialize market grouping if it doesn't exist
    if (!groupedInvestments[marketType]) {
      groupedInvestments[marketType] = {
        investments: [],
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        totalBalance: 0, // Initialize totalBalance for each market type
      };
    }

    // Accumulate individual investment data
    groupedInvestments[marketType].investments.push(investment);
    groupedInvestments[marketType].totalProfitLoss += investment.profitLoss;

    // Accumulate the balance (amount * currentPrice) for each market
    const balance = investment.amount * investment.currentPrice;
    groupedInvestments[marketType].totalBalance += balance;
  });

  // Calculate total profit/loss percentage and balance by market
  Object.keys(groupedInvestments).forEach((market) => {
    const totalProfitLoss = totalProfitLossByMarket[market] || 0;
    const totalValue = totalValueByMarket[market] || 0;

    // Calculate profit/loss percentage for the market
    const totalProfitLossPercentage =
      totalValue > 0 ? (totalProfitLoss / totalValue) * 100 : 0;

    // Round and assign final values
    groupedInvestments[market].totalBalance = roundToTwoDecimalPlaces(
      groupedInvestments[market].totalBalance
    );
    groupedInvestments[market].totalProfitLoss = roundToTwoDecimalPlaces(
      groupedInvestments[market].totalProfitLoss
    );
    groupedInvestments[market].totalProfitLossPercentage =
      roundToTwoDecimalPlaces(totalProfitLossPercentage);
  });

  return groupedInvestments;
};

// @desc      Get all investments by account Id, grouped by market type, in the target currency
// @route     GET /api/v1/investments/prices
// @access    Public
export const getInvestmentPrices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { currency = "usd", accountId, range = "all" } = req.query;

    if (!accountId) {
      res.status(400).json({ message: "Account ID is required." });
      return;
    }

    // Fetch all investments for the accountId and populate asset details
    const investments = await Investment.find({ account: accountId }).populate(
      "asset"
    );

    if (!investments.length) {
      res.status(404).json({ message: "No investments found." });
      return;
    }

    // Fetch the prices for the investments in the target currency
    const { investmentDetails, totalProfitLossByMarket, totalValueByMarket } =
      await fetchInvestmentPrices(
        investments,
        currency as Currency,
        range as "daily" | "weekly" | "monthly" | "all"
      );

    // Group the results by asset market type (crypto, usa-stock, etc.) and include total profit/loss and percentage
    const groupedInvestments = groupInvestmentsByMarket(
      investmentDetails,
      totalProfitLossByMarket,
      totalValueByMarket
    );

    // Calculate general total profit/loss, balance, and profit/loss percentage
    let totalProfitLoss = 0;
    let totalValue = 0;
    let generalBalance = 0; // Initialize general balance

    // Sum up total profit/loss, total value, and total balance across all markets
    Object.keys(groupedInvestments).forEach((market) => {
      totalProfitLoss += groupedInvestments[market].totalProfitLoss;
      totalValue += totalValueByMarket[market];
      generalBalance += groupedInvestments[market].totalBalance; // Add balance for each market type
    });

    // Calculate the general profit/loss percentage
    const profitLossPercentage =
      totalValue > 0 ? (totalProfitLoss / totalValue) * 100 : 0;

    // Prepare the final response
    res.json({
      investmentPrices: groupedInvestments,
      totalProfitLoss: roundToTwoDecimalPlaces(totalProfitLoss),
      profitLossPercentage: roundToTwoDecimalPlaces(profitLossPercentage),
      generalBalance: roundToTwoDecimalPlaces(generalBalance), // Include general balance
    });
  }
);

// @desc      Get all investments
// @route     GET /api/v1/investments
// @access    Public
export const getInvestments = asyncHandler(
  async (req: Request, res: any, next: NextFunction): Promise<void> => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc      Get single investment
// @route     GET /api/v1/investments/:id
// @access    Public
export const getInvestment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return next(
        new ErrorResponse(
          `investment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: investment,
    });
  }
);

// @desc      Create investment
// @route     POST /api/v1/investments
// @access    Public
export const createInvestment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const investment = await Investment.create(req.body);

    res.status(201).json({
      success: true,
      data: investment,
    });
  }
);

// @desc      Update investment
// @route     PUT /api/v1/investments/:id
// @access    Public
export const updateInvestment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const investment = await Investment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!investment) {
      return next(
        new ErrorResponse(
          `investment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: investment,
    });
  }
);

// @desc      Delete investment
// @route     DELETE /api/v1/investments/:id
// @access    Public
export const deleteInvestment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const investment = await Investment.findByIdAndDelete(req.params.id);

    if (!investment) {
      return next(
        new ErrorResponse(
          `investment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  }
);
