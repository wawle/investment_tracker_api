import express from "express";
import { getMarketData } from "../controllers/scraping";

const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/auth");

router.use(protect);

// Get single account, update account, delete account
router.route("/").get(getMarketData);

export default router;
