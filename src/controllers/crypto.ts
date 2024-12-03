import { Request, NextFunction, Response } from 'express';
import asyncHandler from '../middleware/async';
import { priceProvider } from '../utils/price-provider';
import { Market } from '../utils/enums';

// @desc      Get all crypto
// @route     GET /api/v1/crypto
// @access    Public
export const getCrypto = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get the search query param (optional)
  const search = req.query.search ? req.query.search.toString() : '';

  // Use fetchPriceData to get the data, passing the search term
  const data = await priceProvider(Market.Crypto, search);

    res.status(200).json({success: true, data});
  });