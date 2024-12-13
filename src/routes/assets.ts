import express from "express";
import {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetTypes,
} from "../controllers/assets";
import advancedResults from "../middleware/advancedResults";
import Asset from "../models/Asset";

const router = express.Router({ mergeParams: true });

// Get all Assets and create Asset
router
  .route("/")
  .get(advancedResults(Asset as any), getAssets)
  .post(createAsset);

router.route("/types").get(getAssetTypes);

// Get single Asset, update Asset, delete Asset
router.route("/:id").get(getAsset).put(updateAsset).delete(deleteAsset);

export default router;
