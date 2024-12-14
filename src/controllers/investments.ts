import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset, { IAsset } from "../models/Asset";
import { AssetMarket, Currency } from "../utils/enums";
import { roundToTwoDecimalPlaces } from "../utils";
import Investment, { IInvestment } from "../models/Investment";
import ErrorResponse from "../utils/errorResponse";

// Define the structure for the profit/loss data
export interface IInvestmentWithProfitLoss {
  assetId: string;
  symbol: string;
  type: AssetMarket;
  name: string;
  icon?: string;
  avgPrice: number;
  amount: number;
  currentPrice: number;
  balance: number;
  profitLoss: number;
  profitLossPercentage: number;
}

// Fetch prices for all investments based on the market type
const fetchInvestmentPrices = async (
  investments: IInvestment[],
  targetCurrency: Currency
): Promise<{
  investmentDetails: IInvestmentWithProfitLoss[];
  totalProfitLossByMarket: { [market: string]: number };
  totalValueByMarket: { [market: string]: number };
  totalAmountByMarket: { [market: string]: number };
}> => {
  const investmentDetails: IInvestmentWithProfitLoss[] = [];
  const totalProfitLossByMarket: { [market: string]: number } = {};
  const totalValueByMarket: { [market: string]: number } = {}; // Total value for each market type
  const totalAmountByMarket: { [market: string]: number } = {}; // Total amount for each market type

  // Create a set of asset IDs from the investments to reduce database queries
  const assetIds = Array.from(
    new Set(investments.map((investment) => investment.asset._id.toString()))
  );

  // Fetch all asset details in parallel (reduce redundant queries)
  const assets = await Asset.find({ _id: { $in: assetIds } });

  // Fetch conversion rates for the target currency and all relevant currencies at once
  const conversionRates = await fetchConversionRatesForAssets(
    assets,
    targetCurrency
  );

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

    const { price: currentPrice, market } = assetDetails;

    // Get the conversion rate from the cache (conversionRates already contain rates for TRY, USD, EUR)
    const assetConversionRate = conversionRates[assetDetails.currency];

    // Convert the current price based on the conversion rate (converting to the target currency)
    const convertedCurrentPrice = currentPrice * assetConversionRate;

    // Convert avg_price as well
    const convertedAvgPrice = avg_price * assetConversionRate;

    // Calculate balance and profit/loss in the target currency
    const balance = amount * convertedCurrentPrice;
    const profitLoss = balance - amount * convertedAvgPrice;
    const profitLossPercentage =
      (profitLoss / (amount * convertedAvgPrice)) * 100;

    // Prepare the result for this investment
    investmentDetails.push({
      assetId: asset.id,
      symbol: asset.ticker,
      type: market,
      icon: asset.icon,
      name: asset.name,
      avgPrice: roundToTwoDecimalPlaces(convertedAvgPrice),
      amount,
      currentPrice: roundToTwoDecimalPlaces(convertedCurrentPrice),
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

// Fetch all required conversion rates in parallel (memoization)
const fetchConversionRatesForAssets = async (
  assets: IAsset[],
  targetCurrency: Currency
): Promise<{ [currency: string]: number }> => {
  // Extract all unique currencies used in the assets
  const currencies = Array.from(new Set(assets.map((asset) => asset.currency)));

  // Fetch conversion rates for all currencies at once
  const conversionPromises = currencies.map((currency) =>
    getCurrencyConversionRate(currency, targetCurrency)
  );
  const conversionRates = await Promise.all(conversionPromises);

  // Map currencies to their conversion rates
  const rates: { [currency: string]: number } = {};
  currencies.forEach((currency, index) => {
    rates[currency] = conversionRates[index];
  });

  return rates;
};

export const getCurrencyConversionRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // If both currencies are the same, return 1 as no conversion is needed
  if (fromCurrency === toCurrency) return 1;

  // Prepare cache key for conversion rate
  const cacheKey = `${fromCurrency}_${toCurrency}`;

  // Check if conversion rate is cached
  if (conversionRateCache[cacheKey]) {
    console.log("Cache hit for", cacheKey);
    return conversionRateCache[cacheKey];
  }

  let conversionRate: number;

  try {
    if (toCurrency === Currency.TRY) {
      // Converting to TRY, use the price of the 'fromCurrency' in TRY
      const fromAsset = await Asset.findOne({
        ticker: fromCurrency.toUpperCase(),
        currency: Currency.TRY,
      });

      if (fromAsset) {
        conversionRate = fromAsset.price; // fromCurrency to TRY
      } else {
        throw new Error(`Conversion rate not found for ${fromCurrency} in TRY`);
      }
    } else if (fromCurrency === Currency.TRY) {
      // Converting from TRY, use the price of the 'toCurrency' in TRY
      const toAsset = await Asset.findOne({
        ticker: toCurrency.toUpperCase(),
        currency: Currency.TRY,
      });

      if (toAsset) {
        conversionRate = 1 / toAsset.price; // TRY to toCurrency
      } else {
        throw new Error(`Conversion rate not found for ${toCurrency} in TRY`);
      }
    } else {
      // Converting between two non-TRY currencies (e.g., USD to EUR)
      const [fromAsset, toAsset] = await Promise.all([
        Asset.findOne({
          ticker: fromCurrency.toUpperCase(),
          currency: Currency.TRY,
        }),
        Asset.findOne({
          ticker: toCurrency.toUpperCase(),
          currency: Currency.TRY,
        }),
      ]);

      if (fromAsset && toAsset) {
        // USD to EUR or other non-TRY to non-TRY conversions
        conversionRate = fromAsset.price / toAsset.price;
      } else {
        throw new Error(
          `Conversion rate not found for ${fromCurrency} or ${toCurrency} in TRY`
        );
      }
    }
  } catch (error) {
    throw error;
  }

  // Cache the conversion rate for future use
  conversionRateCache[cacheKey] = conversionRate;

  console.log("Conversion rate calculated:", conversionRate);

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
      totalBalance: number; // New property to track total balance by market
    };
  } = {};

  investmentPrices.forEach((investment) => {
    if (!groupedInvestments[investment.type]) {
      groupedInvestments[investment.type] = {
        investments: [],
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        totalBalance: 0, // Initialize totalBalance for each market type
      };
    }
    groupedInvestments[investment.type].investments.push(investment);
    groupedInvestments[investment.type].totalProfitLoss +=
      investment.profitLoss;
    groupedInvestments[investment.type].totalBalance +=
      investment.amount * investment.currentPrice; // Accumulate the balance
  });

  // Add total profit/loss percentage and balance by market
  Object.keys(groupedInvestments).forEach((market) => {
    const totalProfitLoss = totalProfitLossByMarket[market];
    const totalValue = totalValueByMarket[market];

    // Calculate profit/loss percentage for the market
    const totalProfitLossPercentage = (totalProfitLoss / totalValue) * 100;
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
export const getInvestmentPrices = asyncHandler(async (req: any, res: any) => {
  const { currency = "usd", accountId } = req.query;

  // Fetch all investments for the accountId and populate asset details
  const investments = await Investment.find({ account: accountId }).populate(
    "asset"
  );

  if (!investments.length) {
    return res.status(404).json({ message: "No investments found." });
  }

  // Fetch the prices for the investments in the target currency
  const { investmentDetails, totalProfitLossByMarket, totalValueByMarket } =
    await fetchInvestmentPrices(investments, currency);

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
});

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
