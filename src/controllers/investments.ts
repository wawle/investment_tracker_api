import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset from "../models/Asset";
import { AssetMarket, Currency } from "../utils/enums";
import { roundToTwoDecimalPlaces } from "../utils";
import Investment, { IInvestment } from "../models/Investment";
import ErrorResponse from "../utils/errorResponse";
import { getCurrencyConversionRate } from "./exchange";

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

  // Loop through all investments and fetch their prices based on market type
  for (const investment of investments) {
    const { asset, amount, avg_price } = investment;

    // Fetch the asset details from the database
    const assetDetails = await Asset.findById(asset._id);

    if (!assetDetails) {
      console.error(`No asset found for symbol: ${asset.ticker}`);
      continue;
    }

    const { price: currentPrice, market, currency } = assetDetails;

    // Set the fromCurrency based on the asset's market type
    let fromCurrency: Currency;
    switch (market) {
      case AssetMarket.TRStock:
      case AssetMarket.Exchange:
      case AssetMarket.Fund:
      case AssetMarket.Commodity:
        fromCurrency = Currency.TRY;
        break;
      case AssetMarket.USAStock:
      case AssetMarket.Crypto:
        fromCurrency = Currency.USD;
        break;
      default:
        fromCurrency = Currency.TRY;
        break;
    }

    // Fetch the conversion rate from the asset's currency to the target currency
    const assetConversionRate = await getCurrencyConversionRate(
      fromCurrency,
      targetCurrency
    );

    // Convert the current price based on the conversion rate
    let convertedCurrentPrice = currentPrice * assetConversionRate;

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
