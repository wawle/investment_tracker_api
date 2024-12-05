import express from "express";
import { getStocks, getTrStocks, getUsaStocks } from "../controllers/stocks";

const router = express.Router({ mergeParams: true });

// Get all stocks
router.route("/").get(getStocks);

// Get all stocks from tr
router.route("/tr").get(getTrStocks);

// Get all stocks from usa
router.route("/usa").get(getUsaStocks);

export default router;
