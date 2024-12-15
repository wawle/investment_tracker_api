import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import Asset from "../models/Asset";
import constants from "../utils/constants";
import { AssetMarket } from "../utils/enums";

// @desc      Get all assets
// @route     GET /api/v1/assets
// @access    Public
export const getAssets = asyncHandler(
  async (req: Request, res: any, next: NextFunction): Promise<void> => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc      Get single asset
// @route     GET /api/v1/assets/:id
// @access    Public
export const getAsset = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return next(
        new ErrorResponse(`asset not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  }
);

// @desc      Create asset
// @route     POST /api/v1/assets
// @access    Public
export const createAsset = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const asset = await Asset.create(req.body);

    res.status(201).json({
      success: true,
      data: asset,
    });
  }
);

// @desc      Update asset
// @route     PUT /api/v1/assets/:id
// @access    Public
export const updateAsset = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!asset) {
      return next(
        new ErrorResponse(`asset not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  }
);

// @desc      Delete asset
// @route     DELETE /api/v1/assets/:id
// @access    Public
export const deleteAsset = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const asset = await Asset.findByIdAndDelete(req.params.id);

    if (!asset) {
      return next(
        new ErrorResponse(`asset not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  }
);

// @desc      Get single asset
// @route     GET /api/v1/assets/types
// @access    Public
export const getAssetTypes = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.status(200).json({
      success: true,
      data: constants.asset_type_list,
    });
  }
);

// @desc      Get trend assets
// @route     GET /api/v1/assets/trends
// @access    Public
export const getTrendAssets = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // List of tickers for which we want to fetch trend data
    const assetTickers = [
      { market: AssetMarket.Exchange, ticker: "USD" },
      { market: AssetMarket.Exchange, ticker: "EUR" },
      { market: AssetMarket.Indicies, ticker: "SPX" },
      { market: AssetMarket.Indicies, ticker: "IXIC" },
      { market: AssetMarket.Indicies, ticker: "XU100" },
      { market: AssetMarket.Crypto, ticker: "BTC" },
      { market: AssetMarket.Crypto, ticker: "ETH" },
    ];
    // Fetch assets by both ticker and market
    const trendAssets = await Asset.find({
      $or: assetTickers.map((asset) => ({
        ticker: asset.ticker,
        market: asset.market,
      })),
    });

    // If no assets are found, send a response with an empty data array
    if (!trendAssets || trendAssets.length === 0) {
      res.status(404).json({
        success: false,
        message: "No trend assets found.",
      });
    }

    // Return the fetched assets (you can customize this to return specific trend data)
    res.status(200).json({
      success: true,
      data: trendAssets,
    });
  }
);
