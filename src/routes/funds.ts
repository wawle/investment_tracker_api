import express from "express";
import { getFundByTicker, getFunds } from "../controllers/funds";

const router = express.Router({ mergeParams: true });

// Get all exhanges
router.route("/").get(getFunds);

router.route("/:ticker").get(getFundByTicker);

export default router;
