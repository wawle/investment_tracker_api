import cron from "node-cron";
import Asset from "../models/Asset";
import History from "../models/History"; // History modelini dahil ediyoruz
import { fetchMarketData } from "../controllers/scraping";

// 15 dakikada bir market verilerini çek
export const startScheduler = () => {
  cron.schedule("*/15 * * * *", () => {
    // Promise'i döndürmeden işlemi başlat
    (async () => {
      try {
        console.log("Scraping started at", new Date().toLocaleString());
        await fetchMarketData();
        console.log("Scraping done at", new Date().toLocaleString());
      } catch (error) {
        console.error("Scraping error:", error);
      }
    })();
  });
};

// Günlük işlem için yardımcı fonksiyon
const processDailyHistory = async () => {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);

  try {
    const assetsWithoutHistory = await Asset.aggregate([
      {
        $lookup: {
          from: "histories",
          localField: "_id",
          foreignField: "asset",
          as: "histories",
        },
      },
      {
        $match: {
          "histories.createdAt": { $not: { $gte: todayStart, $lte: todayEnd } },
        },
      },
    ]);

    const historyRecords = assetsWithoutHistory.map((asset) => ({
      asset: asset._id,
      close_price: asset.price,
    }));

    if (historyRecords.length > 0) {
      await History.insertMany(historyRecords);
      console.log(`Created ${historyRecords.length} new history records.`);
    } else {
      console.log("All assets already have history records for today.");
    }
  } catch (error) {
    console.error("Daily history processing error:", error);
  }
};

// Cron job for daily scraping and history creation
export const startDailyJob = () => {
  cron.schedule("59 23 * * *", () => {
    // Promise'i döndürmeden işlemi başlat
    (async () => {
      try {
        console.log(
          "Daily scraping and history creation started at",
          new Date().toLocaleString()
        );

        await processDailyHistory();

        console.log(
          "Daily scraping and history creation done at",
          new Date().toLocaleString()
        );
      } catch (error) {
        console.error("Daily job error:", error);
      }
    })();
  });
};
