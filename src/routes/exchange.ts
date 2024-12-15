import express from "express";
import { getExchangeRates, getExchanges } from "../controllers/exchange";

const router = express.Router({ mergeParams: true });

// Get all exhanges
router.route("/").get(getExchanges);

router.route("/rates").get(getExchangeRates);

export default router;
