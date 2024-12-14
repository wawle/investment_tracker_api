import Asset from "../models/Asset";
import { getCountryFlag, parsePrice } from "../utils";
import { AssetMarket, Currency, Market } from "../utils/enums";
import { priceProvider } from "../utils/price-provider";
import { scrapeGoldPrices } from "./commodity";
import { fetchExchange } from "./exchange";
import { fetchFunds } from "./funds";
import { fetchTRStocks, fetchUsaStocks } from "./stocks";

// Her market türü için verileri eşleştiren fonksiyon
const mapDataToAsset = (data: any[], market: AssetMarket) => {
  return data.map((item) => {
    switch (market) {
      case AssetMarket.USAStock:
        return {
          ticker: item.ticker,
          price: parseFloat(item.price.replace(",", ".")), // Fiyatı sayıya çeviriyoruz
          currency: item.currency?.toLowerCase() as Currency, // Para birimini dönüştürüyoruz
          icon: item.icon,
          name: item.name,
          market,
        };

      case AssetMarket.TRStock:
        return {
          ticker: item.ticker,
          price: parseFloat(item.price.replace(",", ".")), // Fiyatı sayıya çeviriyoruz
          currency: item.currency?.toLowerCase() as Currency, // Para birimini dönüştürüyoruz
          icon: item.icon,
          name: item.name,
          market,
        };

      case AssetMarket.Crypto:
        return {
          ticker: item.ticker,
          price: parsePrice(item.price), // Fiyatı sayıya çeviriyoruz
          currency: item.currency?.toLowerCase() as Currency, // Para birimini dönüştürüyoruz
          icon: item.icon,
          name: item.name,
          market,
        };

      case AssetMarket.Commodity:
        return {
          ticker: item.code, // Commodity'lerde ticker, code ile eşleştiriliyor
          price: item.price, // Fiyatı sayıya çeviriyoruz
          currency: Currency.TRY, // Komoditeler için genellikle TRY kullanılıyor
          icon: "", // Commodity'lerde icon olmayabilir
          name: item.name,
          market,
        };

      case AssetMarket.Exchange:
        return {
          ticker: item.code, // Dövizler için ticker, code ile eşleştiriliyor
          price: parseFloat(item.sell.replace(",", ".")), // Sell değeri price olarak alınacak
          currency: Currency.TRY, // Dolar/TL örneğinde TRY kullanılıyor
          icon: getCountryFlag(item.code), // Exchange verisinde genellikle icon yok
          name: item.name,
          market,
        };

      case AssetMarket.Fund:
        return {
          ticker: item.fundCode.replace("(", ""), // Fonlarda ticker, fundCode ile eşleştiriliyor
          price: parseFloat(item.price.replace(",", ".")), // Fiyatı sayıya çeviriyoruz
          currency: Currency.TRY, // Fonlar için genellikle TRY kullanılıyor
          icon: "", // Fonlarda genellikle icon yok
          name: item.fundName,
          market,
        };

      default:
        throw new Error(`Unknown market type: ${market}`);
    }
  });
};

// Asset'leri güncelleme fonksiyonu
const updateAssetPrices = async (data: any[], market: AssetMarket) => {
  const assetsToUpdate = mapDataToAsset(data, market);

  // Veritabanında asset'leri güncelleme
  await Promise.all(
    assetsToUpdate.map(async (item) => {
      await Asset.findOneAndUpdate(
        { ticker: item.ticker, market: item.market }, // Ticker ve market bazında arama
        {
          price: item.price, // Fiyatı güncelle
          currency: item.currency, // Para birimini güncelle
          name: item.name, // İsim bilgisini güncelle
          icon: item.icon, // Logoyu güncelle
          scrapedAt: new Date(), // Çekilme zamanını güncelle
        },
        { upsert: true, new: true } // Eğer asset yoksa yeni bir tane oluştur, varsa güncelle
      );
    })
  );
};

// fetchMarketData fonksiyonunda update işlemi
export const fetchMarketData = async () => {
  const [usaStocks, trStocks, crypto, commodities, exchange, funds] =
    await Promise.all([
      fetchUsaStocks(), // USA borsası verisi
      fetchTRStocks(), // BIST100 verisi
      priceProvider(Market.Crypto), // Kripto para verisi
      scrapeGoldPrices(), // Altın fiyatları
      fetchExchange(), // Dolar/TL gibi döviz kurları
      fetchFunds(), // Fonlar verisi
    ]);

  // Verileri güncellemek için her marketi iterasyona sokuyoruz
  await Promise.all([
    updateAssetPrices(usaStocks, AssetMarket.USAStock),
    updateAssetPrices(trStocks, AssetMarket.TRStock),
    updateAssetPrices(crypto, AssetMarket.Crypto),
    updateAssetPrices(commodities, AssetMarket.Commodity),
    updateAssetPrices(exchange, AssetMarket.Exchange),
    updateAssetPrices(funds, AssetMarket.Fund),
  ]);

  return {
    usaStocks,
    trStocks,
    crypto,
    commodities,
    exchange,
    funds,
  };
};

// @desc      Get all market data
// @route     GET /api/v1/scraping
// @access    Public
// Scraping servisinin tüm marketler için veri çekmesini sağlayacak fonksiyon
export const getMarketData = async (req: Request, res: any) => {
  try {
    const data = await fetchMarketData();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "An error occurred while fetching market data.",
    });
  }
};
