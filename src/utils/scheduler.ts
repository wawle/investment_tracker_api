import cron from "node-cron";
import Asset from "../models/Asset";
import History from "../models/History"; // History modelini dahil ediyoruz
import { fetchMarketData } from "../controllers/scraping";
import BrowserPool from "./browser-pool";

// İşlem kilitleri
let scrapingInProgress = false;
let dailyJobInProgress = false;

// Bellek temizleme fonksiyonu
const cleanupMemory = () => {
  // Kullanılmayan nesneleri temizle
  if (global.gc) {
    global.gc();
  }
};

// 30 dakikada bir market verilerini çek
export const startScheduler = () => {
  cron.schedule("*/30 * * * *", async () => {
    // Eğer önceki işlem hala çalışıyorsa, yeni işlemi başlatma
    if (scrapingInProgress) {
      console.log(
        "Önceki scraping işlemi hala devam ediyor, yeni işlem başlatılmıyor."
      );
      return;
    }

    scrapingInProgress = true;
    try {
      console.log("Scraping started at", new Date().toLocaleString());
      await fetchMarketData();
      console.log("Scraping done at", new Date().toLocaleString());

      // İşlem bittikten sonra belleği temizle
      cleanupMemory();
    } catch (error) {
      console.error("Scraping error:", error);
    } finally {
      scrapingInProgress = false;
    }
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
  cron.schedule("59 23 * * *", async () => {
    // Eğer önceki işlem hala çalışıyorsa, yeni işlemi başlatma
    if (dailyJobInProgress) {
      console.log(
        "Önceki günlük işlem hala devam ediyor, yeni işlem başlatılmıyor."
      );
      return;
    }

    dailyJobInProgress = true;
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

      // İşlem bittikten sonra belleği temizle
      cleanupMemory();
    } catch (error) {
      console.error("Daily job error:", error);
    } finally {
      dailyJobInProgress = false;
    }
  });
};

// Uygulama kapatılırken browser havuzunu temizle
export const cleanupResources = async () => {
  try {
    const browserPool = BrowserPool.getInstance();
    await browserPool.cleanup();
    console.log("Browser resources cleaned up");
  } catch (error) {
    console.error("Error cleaning up resources:", error);
  }
};
