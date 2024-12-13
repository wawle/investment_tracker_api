import express from "express";
import {
  getHistories,
  getHistory,
  createHistory,
  updateHistory,
  deleteHistory,
} from "../controllers/histories";
import advancedResults from "../middleware/advancedResults";
import History from "../models/History";

const router = express.Router({ mergeParams: true });

// Get all Histories and create History
router
  .route("/")
  .get(advancedResults(History as any), getHistories)
  .post(createHistory);

// Get single History, update History, delete History
router.route("/:id").get(getHistory).put(updateHistory).delete(deleteHistory);

export default router;
