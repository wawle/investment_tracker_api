import { Request } from "express";
import Asset from "../models/Asset";
import { AssetMarket, Currency, Market } from "../utils/enums";
import { priceProvider } from "../utils/price-provider";
import { scrapeGoldPrices } from "./commodity";
import { fetchExchange } from "./exchange";
import { fetchFunds } from "./funds";
import { fetchIndices } from "./indicies";
import { fetchTRStocks, fetchUsaStocks } from "./stocks";

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
      ticker: item.ticker || item.code || item.fundCode, // Handle multiple field names for ticker
      price, // Assuming `price` contains the base currency prices (e.g., TRY, USD, EUR)
      currency: currency,
      icon: item.icon || "", // Default empty string if not provided
      name: item.name || item.fundName || "", // Handle multiple field names for name
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
  const assetsToUpdate = mapDataToAsset(data, market);
  await Promise.all(
    assetsToUpdate.map(async (item) => {
      // Update asset data in the database

      await Asset.findOneAndUpdate(
        { ticker: item.ticker, market: item.market },
        {
          price: item.price,
          currency: item.currency,
          name: item.name,
          icon: item.icon,
        },
        { upsert: true, new: true }
      );
    })
  );
};

// fetchMarketData fonksiyonunda update işlemi
export const fetchMarketData = async () => {
  const [usaStocks, trStocks, crypto, commodities, exchange, funds, indicies] =
    await Promise.all([
      fetchUsaStocks(), // USA borsası verisi
      fetchTRStocks(), // BIST100 verisi
      priceProvider(Market.Crypto), // Kripto para verisi
      scrapeGoldPrices(), // Altın fiyatları
      fetchExchange(), // Dolar/TL gibi döviz kurları
      fetchFunds(), // Fonlar verisi
      fetchIndices(), // Endeksler
    ]);

  // Verileri güncellemek için her marketi iterasyona sokuyoruz
  await Promise.all([
    updateAssetPrices(usaStocks, AssetMarket.USAStock),
    updateAssetPrices(trStocks, AssetMarket.TRStock),
    updateAssetPrices(crypto, AssetMarket.Crypto),
    updateAssetPrices(commodities, AssetMarket.Commodity),
    updateAssetPrices(exchange, AssetMarket.Exchange),
    updateAssetPrices(funds, AssetMarket.Fund),
    updateAssetPrices(indicies, AssetMarket.Indicies),
  ]);

  return {
    usaStocks,
    trStocks,
    crypto,
    commodities,
    exchange,
    funds,
    indicies,
  };
};

// @desc      Get all market data or data for a specific market
// @route     GET /api/v1/scraping
// @access    Public
export const getMarketData = async (req: Request, res: any) => {
  const { market } = req.query; // Get the market query parameter

  try {
    // If a market is provided, validate it
    if (market && !Object.values(AssetMarket).includes(market as AssetMarket)) {
      return res.status(400).json({
        success: false,
        error: "Invalid market type provided.",
      });
    }

    let data;

    if (market) {
      // If the market query parameter is provided, fetch data for that market
      data = await fetchMarketDataForSpecificMarket(market as AssetMarket);
    } else {
      // If no market query parameter, fetch data for all markets
      data = await fetchMarketData();
    }

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
