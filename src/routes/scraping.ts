import express from "express";
import { getMarketData } from "../controllers/scraping";

const router = express.Router({ mergeParams: true });

// Get single account, update account, delete account
router.route("/").get(getMarketData);

export default router;
