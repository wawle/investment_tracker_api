import { Request, NextFunction, Response } from "express";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import constants from "../utils/constants";
import { priceProvider } from "../utils/price-provider";
import { Market } from "../utils/enums";

// @desc      Get all stocks
// @route     GET /api/v1/stocks
// @access    Public
export const getStocks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const market = constants.market_list.find(
      (item) => item.market === req.query.market
    );

    if (!market) return next(new ErrorResponse(`market params missing`, 400));

    // Get the search query param (optional)
    const search = req.query.search ? req.query.search.toString() : "";

    // Use fetchPriceData to get the data, passing the search term
    const data = await priceProvider(market.market, search);

    res.status(200).json({ success: true, data });
  }
);

// @desc      Get all stocks from tr
// @route     GET /api/v1/stocks/tr
// @access    Public
export const getTrStocks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get the search query param (optional)
    const search = req.query.search ? req.query.search.toString() : "";

    // Use fetchPriceData to get the data, passing the search term
    const data = await priceProvider(Market.Bist100, search);

    res.status(200).json({ success: true, data });
  }
);

// @desc      Get all stocks from usa
// @route     GET /api/v1/stocks/usa
// @access    Public
export const getUsaStocks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const stocks = await fetchUsaStocks();
    // Get the search query param (optional)
    const search = req.query.search ? req.query.search.toString() : "";

    // If there is a search term, filter the results
    const filteredStocks = search
      ? stocks.filter((item: any) =>
          item.ticker.toLowerCase().includes((search as string).toLowerCase())
        )
      : stocks;

    res.status(200).json({ success: true, data: filteredStocks });
  }
);

export const fetchUsaStocks = async () => {
  // Get the search query param (optional)
  const fetchResources = [
    Market.DownJones,
    Market.Electronic,
    Market.Nasdaq,
    Market.SP500,
  ];

  // Fetch data for all the resources
  const responses = await Promise.all(
    fetchResources.map((resource) => priceProvider(resource, ""))
  );

  // Flatten the responses into a single array
  const data = responses.reduce((prev, curr) => [...prev, ...curr], []);
  // Remove duplicates based on ticker value using a Set
  const uniqueData = data.reduce(
    (
      accumulator: {
        ticker: string;
        price: string;
        currency: string;
        icon: string | null;
        name: string;
      }[],
      current
    ) => {
      // Check if the ticker already exists in the accumulator
      if (!accumulator.some((item: any) => item.ticker === current.ticker)) {
        accumulator.push(current);
      }
      return accumulator;
    },
    []
  );

  return uniqueData;
};
