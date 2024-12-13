import cron from "node-cron";
import { fetchMarketData } from "../controllers/scraping";
import Asset from "../models/Asset";
import History from "../models/History"; // History modelini dahil ediyoruz

// 15 dakikada bir market verilerini çek
export const startScheduler = () => {
  cron.schedule("*/15 * * * *", async () => {
    console.log("Scraping started at", new Date().toLocaleString());
    await fetchMarketData();
    console.log("Scraping done!");
  });
};

// Her gün sonunda asset verilerini çek ve history kaydını oluştur
export const startDailyJob = () => {
  cron.schedule("0 23 * * *", async () => {
    // Her gün saat 23:00'te çalışacak
    console.log(
      "Daily scraping and history creation started at",
      new Date().toLocaleString()
    );

    // Veritabanındaki tüm assets için işlem yapıyoruz
    const assets = await Asset.find(); // Tüm assetleri alıyoruz

    await Promise.all(
      assets.map(async (asset) => {
        // O gün için zaten bir history kaydının olup olmadığını kontrol et
        const existingHistory = await History.findOne({
          asset: asset._id,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)), // Bugünün tarihi
            $lt: new Date(new Date().setHours(23, 59, 59, 999)), // Bugün sonu
          },
        });

        if (existingHistory) {
          console.log(
            `History already exists for asset ${asset.ticker} today.`
          );
          return; // Eğer history kaydı varsa, işlem yapma
        }

        // Eğer yoksa, yeni bir history kaydı oluştur
        const history = new History({
          asset: asset._id,
          close_price: asset.price, // Günün fiyatı
        });

        await history.save(); // History kaydını kaydet
        console.log(`Created new history for asset ${asset.ticker}`);
      })
    );
  });
};
