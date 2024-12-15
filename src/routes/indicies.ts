import express from "express";
import { getIndicies } from "../controllers/indicies";

const router = express.Router({ mergeParams: true });

// Get all exhanges
router.route("/").get(getIndicies);

export default router;
