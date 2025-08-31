import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import Asset, { IAsset } from "../models/Asset";
import { AssetMarket, Currency } from "../utils/enums";
import { roundToTwoDecimalPlaces } from "../utils";
import Investment, { IInvestment } from "../models/Investment";
import ErrorResponse from "../utils/errorResponse";
import History from "../models/History";
import mongoose from "mongoose";

// Define the structure for the profit/loss data
export interface IInvestmentWithProfitLoss {
  assetId: string;
  ticker: string;
  market: AssetMarket;
  name: string;
  icon?: string;
  currency: Currency;
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

    // Convert the current price based on the conversion rate (converting to the target currency)
    const convertedCurrentPrice = currentPrice[targetCurrency];

    // Convert avg_price as well
    const convertedAvgPrice = avg_price[targetCurrency];

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
      amount,
      assetId: asset.id,
      ticker: asset.ticker,
      market: market,
      icon: asset.icon,
      name: asset.name,
      currency: currency,
      avgPrice: roundToTwoDecimalPlaces(convertedAvgPrice),
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
    const investment = await Investment.findById(req.params.id).populate(
      "asset",
      "name price ticker market currency icon"
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

// @desc Get all investments by account Id, calculate profit/loss and total balance
// @route GET /api/v1/investments/total-balance
// @access Public
export const getInvestmentsTotalBalance = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { currency = "usd", accountId, range = "all" } = req.query;

    if (!accountId) {
      res.status(400).json({ message: "Account ID is required." });
      return;
    }

    // Tarih aralığını belirle
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (range) {
      case "daily":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        startDate = new Date(now);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "all":
      default:
        startDate = new Date(0); // Epoch time
        break;
    }

    const investments = await Investment.aggregate([
      {
        $match: {
          account: new mongoose.Types.ObjectId(accountId as string),
        },
      },
      {
        $lookup: {
          from: "assets",
          localField: "asset",
          foreignField: "_id",
          as: "assetDetails",
        },
      },
      {
        $unwind: "$assetDetails",
      },
      {
        $lookup: {
          from: "histories",
          let: { assetId: "$assetDetails._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$asset", "$$assetId"] },
                    { $gte: ["$createdAt", startDate] },
                    { $lte: ["$createdAt", endDate] },
                  ],
                },
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
          ],
          as: "historyData",
        },
      },
      {
        $addFields: {
          startPrice: {
            $cond: [
              { $gt: [{ $size: "$historyData" }, 0] },
              {
                $cond: [
                  { $eq: [currency, "try"] },
                  { $arrayElemAt: ["$historyData.close_price.try", 0] },
                  {
                    $cond: [
                      { $eq: [currency, "usd"] },
                      { $arrayElemAt: ["$historyData.close_price.usd", 0] },
                      { $arrayElemAt: ["$historyData.close_price.eur", 0] },
                    ],
                  },
                ],
              },
              {
                $cond: [
                  { $eq: [currency, "try"] },
                  "$assetDetails.price.try",
                  {
                    $cond: [
                      { $eq: [currency, "usd"] },
                      "$assetDetails.price.usd",
                      "$assetDetails.price.eur",
                    ],
                  },
                ],
              },
            ],
          },
          currentPrice: {
            $cond: [
              { $eq: [currency, "try"] },
              "$assetDetails.price.try",
              {
                $cond: [
                  { $eq: [currency, "usd"] },
                  "$assetDetails.price.usd",
                  "$assetDetails.price.eur",
                ],
              },
            ],
          },
          avgPrice: {
            $cond: [
              { $eq: [currency, "try"] },
              "$avg_price.try",
              {
                $cond: [
                  { $eq: [currency, "usd"] },
                  "$avg_price.usd",
                  "$avg_price.eur",
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          priceChangeRatio: {
            $cond: [
              { $gt: [{ $size: "$historyData" }, 0] },
              {
                $divide: [
                  { $subtract: ["$currentPrice", "$startPrice"] },
                  "$startPrice",
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          balance: { $multiply: ["$amount", "$currentPrice"] },
          investment: { $multiply: ["$amount", "$avgPrice"] },
          profitLoss: {
            $cond: [
              { $gt: [{ $size: "$historyData" }, 0] },
              {
                $multiply: [
                  "$investment",
                  {
                    $divide: [
                      { $subtract: ["$currentPrice", "$startPrice"] },
                      "$startPrice",
                    ],
                  },
                ],
              },
              { $subtract: ["$balance", "$investment"] },
            ],
          },
        },
      },
      {
        $match: {
          amount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalInvestment: { $sum: "$investment" },
          totalProfitLoss: {
            $sum: { $subtract: ["$balance", "$investment"] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBalance: { $round: ["$totalBalance", 2] },
          totalInvestment: { $round: ["$totalInvestment", 2] },
          totalProfitLoss: { $round: ["$totalProfitLoss", 2] },
          totalProfitLossPercentage: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalInvestment", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$totalProfitLoss", "$totalInvestment"] },
                      100,
                    ],
                  },
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    if (!investments.length) {
      res.status(200).json({
        totalBalance: 0,
        totalInvestment: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
      });
      return;
    }

    res.status(200).json(investments[0]);
  }
);

// @desc Get all investments by account Id, grouped by market type, in the target range
// @route GET /api/v1/investments/market-balance
// @access Public
export const getInvestmentsMarketBalance = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { accountId, range = "all" } = req.query;

    if (!accountId) {
      res.status(400).json({ message: "Account ID is required." });
      return;
    }

    // Tarih aralığını belirle
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (range) {
      case "daily":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        startDate = new Date(now);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "all":
      default:
        startDate = new Date(0); // Epoch time
        break;
    }

    const marketBalances = await Investment.aggregate([
      {
        $match: {
          account: new mongoose.Types.ObjectId(accountId as string),
        },
      },
      {
        $lookup: {
          from: "assets",
          localField: "asset",
          foreignField: "_id",
          as: "assetDetails",
        },
      },
      {
        $unwind: "$assetDetails",
      },
      {
        $lookup: {
          from: "histories",
          let: { assetId: "$assetDetails._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$asset", "$$assetId"] },
                    { $gte: ["$createdAt", startDate] },
                    { $lte: ["$createdAt", endDate] },
                  ],
                },
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
          ],
          as: "historyData",
        },
      },
      {
        $addFields: {
          startPrice: {
            $cond: [
              { $gt: [{ $size: "$historyData" }, 0] },
              {
                $cond: [
                  { $eq: ["$assetDetails.currency", "try"] },
                  { $arrayElemAt: ["$historyData.close_price.try", 0] },
                  {
                    $cond: [
                      { $eq: ["$assetDetails.currency", "usd"] },
                      { $arrayElemAt: ["$historyData.close_price.usd", 0] },
                      { $arrayElemAt: ["$historyData.close_price.eur", 0] },
                    ],
                  },
                ],
              },
              {
                $cond: [
                  { $eq: ["$assetDetails.currency", "try"] },
                  "$assetDetails.price.try",
                  {
                    $cond: [
                      { $eq: ["$assetDetails.currency", "usd"] },
                      "$assetDetails.price.usd",
                      "$assetDetails.price.eur",
                    ],
                  },
                ],
              },
            ],
          },
          currentPrice: {
            $cond: [
              { $eq: ["$assetDetails.currency", "try"] },
              "$assetDetails.price.try",
              {
                $cond: [
                  { $eq: ["$assetDetails.currency", "usd"] },
                  "$assetDetails.price.usd",
                  "$assetDetails.price.eur",
                ],
              },
            ],
          },
          avgPrice: {
            $cond: [
              { $eq: ["$assetDetails.currency", "try"] },
              "$avg_price.try",
              {
                $cond: [
                  { $eq: ["$assetDetails.currency", "usd"] },
                  "$avg_price.usd",
                  "$avg_price.eur",
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          balance: { $multiply: ["$amount", "$currentPrice"] },
          investment: { $multiply: ["$amount", "$avgPrice"] },
          rangeProfitLoss: {
            $cond: [
              { $gt: [{ $size: "$historyData" }, 0] },
              {
                $multiply: [
                  "$amount",
                  { $subtract: ["$currentPrice", "$startPrice"] },
                ],
              },
              { $subtract: ["$balance", "$investment"] },
            ],
          },
          totalProfitLoss: { $subtract: ["$balance", "$investment"] },
          rangeProfitLossPercentage: {
            $cond: [
              { $eq: ["$investment", 0] },
              0,
              {
                $multiply: [
                  {
                    $cond: [
                      { $gt: [{ $size: "$historyData" }, 0] },
                      {
                        $divide: [
                          { $subtract: ["$currentPrice", "$startPrice"] },
                          "$startPrice",
                        ],
                      },
                      {
                        $divide: [
                          { $subtract: ["$balance", "$investment"] },
                          "$investment",
                        ],
                      },
                    ],
                  },
                  100,
                ],
              },
            ],
          },
          totalProfitLossPercentage: {
            $cond: [
              { $eq: ["$investment", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$balance", "$investment"] },
                      "$investment",
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          amount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            market: "$assetDetails.market",
            currency: "$assetDetails.currency",
          },
          investments: {
            $push: {
              asset: {
                id: "$assetDetails._id",
                name: "$assetDetails.name",
                ticker: "$assetDetails.ticker",
                icon: "$assetDetails.icon",
                market: "$assetDetails.market",
                currency: "$assetDetails.currency",
              },
              amount: "$amount",
              avgPrice: { $round: ["$avgPrice", 2] },
              currentPrice: { $round: ["$currentPrice", 2] },
              balance: { $round: ["$balance", 2] },
              investment: { $round: ["$investment", 2] },
              profitLoss: {
                $cond: [
                  { $eq: ["$investment", 0] },
                  0,
                  { $round: ["$totalProfitLoss", 2] },
                ],
              },
              profitLossPercentage: {
                $cond: [
                  { $eq: ["$investment", 0] },
                  0,
                  { $round: ["$totalProfitLossPercentage", 2] },
                ],
              },
            },
          },
          totalBalance: { $sum: "$balance" },
          totalInvestment: { $sum: "$investment" },
          totalProfitLoss: { $sum: "$totalProfitLoss" },
          rangeProfitLoss: { $sum: "$rangeProfitLoss" },
        },
      },
      {
        $project: {
          _id: 0,
          market: "$_id.market",
          currency: "$_id.currency",
          investments: 1,
          totalBalance: { $round: ["$totalBalance", 2] },
          totalInvestment: { $round: ["$totalInvestment", 2] },
          totalProfitLoss: { $round: ["$totalProfitLoss", 2] },
          totalProfitLossPercentage: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalInvestment", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$totalProfitLoss", "$totalInvestment"] },
                      100,
                    ],
                  },
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: { market: 1 },
      },
    ]);

    if (!marketBalances.length) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(marketBalances);
  }
);

enum TimeRange {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  ALL = "all",
}

const getRangeDate = (range: TimeRange) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const thisWeekFirstDay = new Date(today);
  thisWeekFirstDay.setDate(
    thisWeekFirstDay.getDate() - thisWeekFirstDay.getDay()
  );
  thisWeekFirstDay.setUTCHours(0, 0, 0, 0);

  const thisMonthFirstDay = new Date();
  thisMonthFirstDay.setDate(1);
  thisMonthFirstDay.setUTCHours(0, 0, 0, 0);

  const thisYearFirstDay = new Date();
  thisYearFirstDay.setMonth(0, 1);
  thisYearFirstDay.setUTCHours(0, 0, 0, 0);

  let createdAt: Date = today;
  switch (range) {
    case TimeRange.DAILY:
      createdAt = yesterday;
      break;
    case TimeRange.WEEKLY:
      createdAt = thisWeekFirstDay;
      break;
    case TimeRange.MONTHLY:
      createdAt = thisMonthFirstDay;
      break;
    case TimeRange.YEARLY:
      createdAt = thisYearFirstDay;
      break;
    case TimeRange.ALL:
      createdAt = new Date(0); // 1970-01-01 - tüm geçmiş
      break;
  }

  return createdAt;
};

export const proTotalBalance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { currency, accountId, range = TimeRange.ALL } = req.query;

    if (!accountId) {
      throw new ErrorResponse("Account ID is required", 400);
    }

    if (!Object.values(TimeRange).includes(range as TimeRange)) {
      throw new ErrorResponse("Invalid range parameter", 400);
    }

    if (!Object.values(Currency).includes(currency as Currency)) {
      throw new ErrorResponse("Invalid currency parameter", 400);
    }

    const investments = await Investment.find({ account: accountId }).populate(
      "asset"
    );

    const createdAt = getRangeDate(range as TimeRange);
    const histories = await History.find({
      asset: { $in: investments.map((investment) => investment.asset._id) },
      createdAt: { $gte: createdAt },
    });

    const currentTotalBalance = investments.reduce((acc, investment) => {
      return (
        acc + investment.amount * investment.asset.price[currency as Currency]
      );
    }, 0);

    const historicalTotalBalance = investments.reduce((acc, investment) => {
      const history = histories.find(
        (history) =>
          history.asset._id.toString() === investment.asset._id.toString()
      );
      if (history) {
        return (
          acc + investment.amount * history.close_price[currency as Currency]
        );
      }
      return (
        acc + investment.amount * investment.asset.price[currency as Currency]
      );
    }, 0);

    const totalInvestment = investments.reduce((acc, investment) => {
      return (
        acc + investment.amount * investment.avg_price[currency as Currency]
      );
    }, 0);

    let totalProfitLoss = 0;
    let totalProfitLossPercentage = 0;

    switch (range) {
      case TimeRange.DAILY:
      case TimeRange.WEEKLY:
      case TimeRange.MONTHLY:
      case TimeRange.YEARLY:
        totalProfitLoss = currentTotalBalance - historicalTotalBalance;
        totalProfitLossPercentage =
          (totalProfitLoss / historicalTotalBalance) * 100;
        break;
      case TimeRange.ALL:
        totalProfitLoss = currentTotalBalance - totalInvestment;
        totalProfitLossPercentage = (totalProfitLoss / totalInvestment) * 100;
        break;
    }

    res.status(200).json({
      totalBalance: roundToTwoDecimalPlaces(currentTotalBalance),
      historicalTotalBalance: roundToTwoDecimalPlaces(historicalTotalBalance),
      totalInvestment: roundToTwoDecimalPlaces(totalInvestment),
      totalProfitLoss: roundToTwoDecimalPlaces(totalProfitLoss),
      totalProfitLossPercentage: roundToTwoDecimalPlaces(
        totalProfitLossPercentage || 0
      ),
    });
  }
);

interface IMarketBalance {
  investments: [
    {
      asset: {
        id: string;
        name: string;
        ticker: string;
        icon?: string;
        market: AssetMarket;
        currency: Currency;
      };
      amount: number;
      avgPrice: number;
      currentPrice: number;
      historyPrice?: number;
      balance: number;
      investment: number;
      profitLoss: number;
      profitLossPercentage: number;
    }
  ];
  market: AssetMarket;
  currency: Currency;
  totalBalance: number;
  totalInvestment: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

export const proMarketBalance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { accountId, range = TimeRange.ALL } = req.query;

    if (!accountId) {
      throw new ErrorResponse("Account ID is required", 400);
    }

    if (!Object.values(TimeRange).includes(range as TimeRange)) {
      throw new ErrorResponse("Invalid range parameter", 400);
    }

    const investments = await Investment.find({ account: accountId }).populate(
      "asset"
    );

    const createdAt = getRangeDate(range as TimeRange);

    const histories = await History.find({
      asset: { $in: investments.map((investment) => investment.asset._id) },
      createdAt: { $gte: createdAt },
    });

    const marketBalances: IMarketBalance[] = [];

    investments.forEach((investment) => {
      const market = investment.asset.market;
      const currency = investment.asset.currency;

      const marketBalance = marketBalances.find(
        (balance) => balance.market === market && balance.currency === currency
      );

      const historyPrice = histories.find(
        (history) =>
          history.asset._id.toString() === investment.asset._id.toString()
      )?.close_price[currency as Currency];

      const currentPrice = investment.asset.price[currency as Currency];
      const avgPrice = investment.avg_price[currency as Currency];
      const balance = investment.amount * currentPrice;

      const totalInvestment = investment.amount * avgPrice;
      let profitLoss = roundToTwoDecimalPlaces(balance - totalInvestment);
      let profitLossPercentage = roundToTwoDecimalPlaces(
        (profitLoss / totalInvestment) * 100
      );

      // Range bazlı kar/zarar hesaplaması - mevcut profitLoss alanını güncelle
      if ((range as TimeRange) !== TimeRange.ALL && historyPrice) {
        // Range bazlı kar/zarar hesapla
        const rangeStartPrice = historyPrice;
        const rangeEndPrice = currentPrice;
        const rangeBalance = investment.amount * rangeEndPrice;
        const rangeInvestment = investment.amount * rangeStartPrice;

        const rangeProfitLoss = roundToTwoDecimalPlaces(
          rangeBalance - rangeInvestment
        );
        const rangeProfitLossPercentage = roundToTwoDecimalPlaces(
          (rangeProfitLoss / rangeInvestment) * 100
        );

        // Mevcut alanları güncelle
        profitLoss = rangeProfitLoss;
        profitLossPercentage = rangeProfitLossPercentage;
      }

      if (marketBalance) {
        marketBalance.investments.push({
          asset: {
            id: investment.asset.id,
            name: investment.asset.name,
            ticker: investment.asset.ticker,
            icon: investment.asset.icon,
            market: investment.asset.market,
            currency: investment.asset.currency,
          },
          amount: investment.amount,
          avgPrice,
          currentPrice,
          balance,
          historyPrice,
          investment: totalInvestment,
          profitLoss,
          profitLossPercentage,
        });
      } else {
        marketBalances.push({
          investments: [
            {
              asset: {
                id: investment.asset.id,
                name: investment.asset.name,
                ticker: investment.asset.ticker,
                icon: investment.asset.icon,
                market: investment.asset.market,
                currency: investment.asset.currency,
              },
              amount: investment.amount,
              avgPrice,
              currentPrice,
              balance,
              historyPrice,
              investment: totalInvestment,
              profitLoss,
              profitLossPercentage,
            },
          ],
          market,
          currency,
          totalBalance: balance,
          totalInvestment,
          totalProfitLoss: profitLoss,
          totalProfitLossPercentage: profitLossPercentage,
        });
      }
    });

    // Calculate total profit/loss and percentage for the range
    marketBalances.forEach((marketBalance) => {
      marketBalance.totalBalance = marketBalance.investments.reduce(
        (acc, investment) => acc + investment.balance,
        0
      );
      marketBalance.totalInvestment = marketBalance.investments.reduce(
        (acc, investment) => acc + investment.investment,
        0
      );
      marketBalance.totalProfitLoss = marketBalance.investments.reduce(
        (acc, investment) => acc + investment.profitLoss,
        0
      );
      marketBalance.totalProfitLossPercentage = roundToTwoDecimalPlaces(
        (marketBalance.totalProfitLoss / marketBalance.totalInvestment) * 100
      );
    });

    res.status(200).json(marketBalances);
  }
);
