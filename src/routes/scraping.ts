import express from "express";
import { fetcDataByMarket, getMarketData } from "../controllers/scraping";

const router = express.Router({ mergeParams: true });

// Get single account, update account, delete account
router.route("/").get(getMarketData);
router.route("/:market").get(fetcDataByMarket);

export default router;
