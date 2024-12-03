import { Request, NextFunction, Response } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/errorResponse';
import constants from '../utils/constants';
import { priceProvider } from '../utils/price-provider';

// @desc      Get all stocks
// @route     GET /api/v1/stocks
// @access    Public
export const getStocks = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const market = constants.market_list.find((item) => item.market === req.query.market);

    if (!market) return next(new ErrorResponse(`market params missing`, 400));

    // Get the search query param (optional)
  const search = req.query.search ? req.query.search.toString() : '';

  // Use fetchPriceData to get the data, passing the search term
  const data = await priceProvider(market.market, search);

    res.status(200).json({success: true, data});
  });
  


 
