import { Request } from "express";
import Asset from "../models/Asset";
import { AssetMarket, Currency, Market } from "../utils/enums";
import { priceProvider } from "../utils/price-provider";
import { scrapeGoldPrices } from "./commodity";
import { fetchExchange } from "./exchange";
import { fetchFunds } from "./funds";
import { fetchIndices } from "./indicies";
import { fetchTRStocks, fetchUsaStocks } from "./stocks";
import constants from "../utils/constants";
import { advancedPriceProvider } from "../utils/advanced-price-provider";
import { getConvertedPrice } from "../utils/rate-handler";

// Her market türü için verileri eşleştiren fonksiyon
const mapDataToAsset = (data: any[], market: AssetMarket) => {
  return data.map((item) => {
    let currency: Currency;
    let price = item.price;

    // Default currency based on asset market
    switch (market) {
      case AssetMarket.TRStock:
        currency = Currency.TRY;
        break;
      case AssetMarket.Exchange:
        currency = Currency.TRY;
        break;
      case AssetMarket.Commodity:
        currency = Currency.TRY;
        break;
      case AssetMarket.Fund:
        price = item.fundPrice;
        currency = Currency.TRY;
        break;
      case AssetMarket.USAStock:
      case AssetMarket.Indicies:
      case AssetMarket.Crypto:
        currency = Currency.USD;
        break;
      default:
        throw new Error(`Unknown market type: ${market}`);
    }
    return {
      ticker: item.ticker, // Handle multiple field names for ticker
      price, // Assuming `price` contains the base currency prices (e.g., TRY, USD, EUR)
      currency: currency,
      icon: item.icon || "", // Default empty string if not provided
      name: item.name || "", // Handle multiple field names for name
      market,
    };
  });
};

/**
 * Update asset prices in various currencies (TRY, USD, EUR).
 * @param data - Asset data to update
 * @param market - The market for the assets
 */
const updateAssetPrices = async (data: any[], market: AssetMarket) => {
  if (!data || data.length === 0) {
    console.log(`${market} için güncellenecek veri bulunamadı`);
    return;
  }

  const assetsToUpdate = mapDataToAsset(data, market);
  const batchSize = 1000; // Optimum batch boyutu
  const batches = [];

  // Verileri batch'lere böl ve price dönüşümlerini yap
  for (let i = 0; i < assetsToUpdate.length; i += batchSize) {
    const batch = assetsToUpdate.slice(i, i + batchSize);

    // Her bir item için price dönüşümünü yap
    const processedBatch = await Promise.all(
      batch.map(async (item) => {
        const convertedPrice = await getConvertedPrice(
          item.currency,
          item.price
        );
        return {
          ...item,
          price: {
            try: convertedPrice[Currency.TRY],
            usd: convertedPrice[Currency.USD],
            eur: convertedPrice[Currency.EUR],
          },
        };
      })
    );

    const bulkOps = processedBatch.map((item) => ({
      updateOne: {
        filter: { ticker: item.ticker, market: item.market },
        update: {
          $set: {
            ticker: item.ticker,
            market: item.market,
            price: item.price,
            currency: item.currency,
            name: item.name,
            icon: item.icon,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));
    batches.push(bulkOps);
  }

  try {
    let totalModified = 0;
    let totalUpserted = 0;

    // Batch'leri paralel olarak işle
    await Promise.all(
      batches.map(async (bulkOps) => {
        const result = await Asset.bulkWrite(bulkOps, {
          ordered: false,
          writeConcern: { w: 1 }, // Write concern ayarı
        });
        totalModified += result.modifiedCount;
        totalUpserted += result.upsertedCount;
      })
    );

    console.log(
      `${market} için toplam ${totalModified} kayıt güncellendi, ${totalUpserted} yeni kayıt eklendi`
    );
  } catch (error) {
    console.error(`${market} verilerini güncellerken hata oluştu:`, error);
    throw error;
  }
};

// fetchMarketData fonksiyonunda update işlemi
export const fetchMarketData = async () => {
  console.log("market verileri scraping işlemi başladı");
  const startTime = Date.now();

  try {
    // Market verilerini paralel olarak çek ve güncelle
    const marketOperations = [
      {
        fetch: fetchUsaStocks,
        market: AssetMarket.USAStock,
        name: "USA Stocks",
      },
      {
        fetch: fetchTRStocks,
        market: AssetMarket.TRStock,
        name: "TR Stocks",
      },
      {
        fetch: () => priceProvider(Market.Crypto),
        market: AssetMarket.Crypto,
        name: "Crypto",
      },
      {
        fetch: scrapeGoldPrices,
        market: AssetMarket.Commodity,
        name: "Commodities",
      },
      {
        fetch: fetchExchange,
        market: AssetMarket.Exchange,
        name: "Exchange",
      },
      {
        fetch: fetchFunds,
        market: AssetMarket.Fund,
        name: "Funds",
      },
      {
        fetch: fetchIndices,
        market: AssetMarket.Indicies,
        name: "Indices",
      },
    ];

    const results = await Promise.allSettled(
      marketOperations.map(async ({ fetch, market, name }) => {
        try {
          console.time(`${name} fetch and update`);
          const data = await fetch();
          await updateAssetPrices(data, market);
          console.timeEnd(`${name} fetch and update`);
          return { name, data, success: true };
        } catch (error) {
          console.error(`${name} işlemi başarısız:`, error);
          return { name, error, success: false };
        }
      })
    );

    const endTime = Date.now();
    console.log(`Toplam işlem süresi: ${(endTime - startTime) / 1000} saniye`);

    // Başarılı sonuçları filtrele ve response objesi oluştur
    const response: Record<string, any> = results.reduce((acc, result) => {
      if (result.status === "fulfilled" && result.value.success) {
        acc[result.value.name.toLowerCase().replace(" ", "")] =
          result.value.data;
      }
      return acc;
    }, {} as Record<string, any>);

    console.log("market verileri güncellendi");
    return response;
  } catch (error) {
    console.error("Market verilerini güncellerken kritik hata:", error);
    throw error;
  }
};

// @desc      Get all market data or data for a specific market
// @route     GET /api/v1/scraping
// @access    Public
export const getMarketData = async (req: Request, res: any) => {
  const { market } = req.query;

  try {
    // İstek hemen cevap versin
    res.status(202).json({
      success: true,
      message: "Market verilerinin güncellenmesi başlatıldı",
    });

    // Veri güncelleme işlemini arka planda başlat
    if (market && !Object.values(AssetMarket).includes(market as AssetMarket)) {
      console.error("Geçersiz market tipi:", market);
      return;
    }

    // Veri güncelleme işlemini arka planda yap
    setTimeout(async () => {
      try {
        if (market) {
          await fetchMarketDataForSpecificMarket(market as AssetMarket);
        } else {
          const [
            usaStocks,
            trStocks,
            crypto,
            commodities,
            exchange,
            funds,
            indicies,
          ] = await Promise.all([
            fetchUsaStocks(),
            fetchTRStocks(),
            priceProvider(Market.Crypto),
            scrapeGoldPrices(),
            fetchExchange(),
            fetchFunds(),
            fetchIndices(),
          ]);

          await Promise.all([
            updateAssetPrices(usaStocks, AssetMarket.USAStock),
            updateAssetPrices(trStocks, AssetMarket.TRStock),
            updateAssetPrices(crypto, AssetMarket.Crypto),
            updateAssetPrices(commodities, AssetMarket.Commodity),
            updateAssetPrices(exchange, AssetMarket.Exchange),
            updateAssetPrices(funds, AssetMarket.Fund),
            updateAssetPrices(indicies, AssetMarket.Indicies),
          ]);
        }
        console.log("Market verileri başarıyla güncellendi");
      } catch (error) {
        console.error("Market verilerini güncellerken hata oluştu:", error);
      }
    }, 0);
  } catch (error) {
    console.error("İstek işlenirken hata oluştu:", error);
    // İstek zaten cevaplandığı için burada res.status() kullanmıyoruz
  }
};

// Fetch data for a specific market
const fetchMarketDataForSpecificMarket = async (market: AssetMarket) => {
  switch (market) {
    case AssetMarket.USAStock:
      const usaStocks = await fetchUsaStocks();
      await updateAssetPrices(usaStocks, AssetMarket.USAStock);
      return { usaStocks };

    case AssetMarket.TRStock:
      const trStocks = await fetchTRStocks();
      await updateAssetPrices(trStocks, AssetMarket.TRStock);
      return { trStocks };

    case AssetMarket.Crypto:
      const crypto = await priceProvider(Market.Crypto);
      await updateAssetPrices(crypto, AssetMarket.Crypto);
      return { crypto };

    case AssetMarket.Commodity:
      const commodities = await scrapeGoldPrices();
      await updateAssetPrices(commodities, AssetMarket.Commodity);
      return { commodities };

    case AssetMarket.Exchange:
      const exchange = await fetchExchange();
      await updateAssetPrices(exchange, AssetMarket.Exchange);
      return { exchange };

    case AssetMarket.Fund:
      const funds = await fetchFunds();
      await updateAssetPrices(funds, AssetMarket.Fund);
      return { funds };

    case AssetMarket.Indicies:
      const indicies = await fetchIndices();
      await updateAssetPrices(indicies, AssetMarket.Indicies);
      return { indicies };

    default:
      throw new Error(`Unknown market type: ${market}`);
  }
};

export const fetcDataByMarket = async (req: Request, res: any) => {
  const { market } = req.params; // Get the market query parameter

  const data = await advancedPriceProvider(
    constants.tradingview_endpoints.markets.tr.stocks.all,
    1
  );

  res.status(200).json({
    success: true,
    market,
    data,
  });
};
