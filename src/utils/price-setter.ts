import axios from "axios";
import * as xml2js from "xml2js";
import { getCountryFlag } from ".";
import { AssetMarket, Currency, Market } from "./enums";
import Asset, { IAsset } from "../models/Asset";
import asyncHandler from "../middleware/async";
import { Request, Response } from "express";
import ErrorResponse from "./errorResponse";
import { CurrencyRates, getCurrencyRates } from "./currency-converter";
import { fetchTRStocks, fetchUsaStocks } from "../controllers/stocks";
import { priceProvider } from "./price-provider";
import { scrapeGoldPrices } from "../controllers/commodity";
import { fetchFunds } from "../controllers/funds";
import { fetchIndices } from "../controllers/indicies";

// fetch eur and usd prices from Asset model if not existings then fetch from fetchExchange() and filter onlu "USD" and "EUR"
const fetchExchange = async (): Promise<
  {
    code: string;
    name: string;
    currency_name: string;
    buy: string;
    sell: string;
    icon: string;
    price: number;
  }[]
> => {
  const response = await axios.get("https://www.tcmb.gov.tr/kurlar/today.xml");

  // XML'i JSON'a dönüştürmek için xml2js kullan
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(response.data);

  // Döviz kuru verilerini içeren bölüm
  const exchangeRates = result.Tarih_Date.Currency;

  const exchange = exchangeRates
    ?.map((item: any) => ({
      code: item["$"].CurrencyCode,
      name: item.Isim,
      currency_name: item.CurrencyName,
      buy: item.BanknoteBuying,
      sell: item.BanknoteSelling,
      price: parseFloat(item.BanknoteSelling.replace(",", ".")),
      icon: getCountryFlag(item["$"].CurrencyCode),
    }))
    .filter(
      (item: {
        code: string;
        name: string;
        currency_name: string;
        buy: string;
        sell: string;
      }) => item.sell !== "" && item.sell !== null && item.sell !== undefined
    ); // Filter out invalid 'sell' values

  return exchange;
};

const fetchExistingAssets = async () => {
  const assetList = [
    { market: AssetMarket.Exchange, ticker: "EUR" },
    { market: AssetMarket.Exchange, ticker: "USD" },
    { market: AssetMarket.Exchange, ticker: "TRY" },
  ];

  const existingAssets = await Promise.all(
    assetList.map(async (asset) => {
      try {
        console.log(`Looking for asset: ${asset.ticker}`);
        const foundAsset = await Asset.findOne({
          market: asset.market,
          ticker: asset.ticker,
        });

        if (foundAsset) {
          console.log(`Found asset: ${asset.ticker}`);
        } else {
          console.log(`Asset ${asset.ticker} not found`);
        }

        return foundAsset || null; // Return null if not found
      } catch (error) {
        console.error("Error fetching asset:", error);
        return null; // Return null on error
      }
    })
  );

  // Filter out the null values (assets that weren't found)
  const existingAssetsFiltered = existingAssets.filter(
    (asset) => asset !== null
  );

  console.log("Existing assets:", existingAssetsFiltered);
  return existingAssetsFiltered;
};

const mapDataToAsset = (data: any[], market: AssetMarket) => {
  return data.map((item) => {
    let currency: Currency;

    // Default currency based on asset market
    switch (market) {
      case AssetMarket.TRStock:
      case AssetMarket.Exchange:
      case AssetMarket.Fund:
      case AssetMarket.Commodity:
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
      price: item.price, // Assuming `price` contains the base currency prices (e.g., TRY, USD, EUR)
      currency: currency,
      icon: item.icon || "", // Default empty string if not provided
      name: item.name || item.fundName || "", // Handle multiple field names for name
      market,
    };
  });
};

export const getAssetPrices = (
  currency: Currency,
  price: number,
  rates: CurrencyRates
) => {
  let priceInTRY, priceInUSD, priceInEUR;

  // Set price for the related currency and calculate the others
  switch (currency) {
    case Currency.TRY:
      // If the base currency is TRY, no conversion needed
      priceInTRY = price;
      priceInUSD = price * rates.try_usd; // 1 TRY = (1 / usdRate) USD
      priceInEUR = price * rates.try_eur; // 1 TRY = (1 / eurRate) EUR
      break;

    case Currency.USD:
      // If the base currency is USD, convert to TRY and EUR
      priceInUSD = price;
      priceInTRY = price * rates.usd_try; // 1 USD = usdRate TRY
      priceInEUR = price * rates.usd_eur; // USD to EUR using conversion rates
      break;

    case Currency.EUR:
      // If the base currency is EUR, convert to TRY and USD
      priceInEUR = price;
      priceInTRY = price * rates.eur_try; // 1 EUR = eurRate TRY
      priceInUSD = price * rates.eur_usd; // EUR to USD using conversion rates
      break;
  }

  const convertedPrice = {
    [Currency.TRY]: priceInTRY,
    [Currency.EUR]: priceInEUR,
    [Currency.USD]: priceInUSD,
  };

  return convertedPrice;
};

/**
 * Update asset prices in various currencies (TRY, USD, EUR).
 * @param data - Asset data to update
 * @param market - The market for the assets
 */
const updateAssetPrices = async (
  data: any[],
  market: AssetMarket,
  usdRate: number,
  eurRate: number
) => {
  const assetsToUpdate = mapDataToAsset(data, market);
  const rates = getCurrencyRates(usdRate, eurRate);
  await Promise.all(
    assetsToUpdate.map(async (item) => {
      // Update asset data in the database
      const price = getAssetPrices(item.currency, item.price, rates);
      await Asset.findOneAndUpdate(
        { ticker: item.ticker, market: item.market },
        {
          price: price,
          currency: item.currency,
          name: item.name,
          icon: item.icon,
          scrapedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    })
  );
};

export const getCurrencyAssets = async () => {
  const assetList = [
    { market: AssetMarket.Exchange, ticker: "EUR" },
    { market: AssetMarket.Exchange, ticker: "USD" },
    { market: AssetMarket.Exchange, ticker: "TRY" },
  ];

  // Check if the assets already exist in the database
  const existingAssets = await fetchExistingAssets();

  // Create a set of existing asset tickers for quick lookup
  const existingTickers = new Set(existingAssets.map((asset) => asset.ticker));

  // Filter out assets that already exist
  const missingAssets = assetList.filter(
    (asset) => !existingTickers.has(asset.ticker)
  );

  // Prepare an array to collect newly created assets
  const newAssets: IAsset[] = [];

  // Fetch exchange data if there are any missing assets
  if (missingAssets.length > 0) {
    const exchangeData = await fetchExchange();

    // Find the EUR and USD exchange rates from the fetched data
    const eurExchange = exchangeData.find((e) => e.code === "EUR");
    const usdExchange = exchangeData.find((e) => e.code === "USD");

    // If EUR and USD data exists, proceed to generate missing assets
    if (eurExchange && usdExchange) {
      // Prepare an array of new asset promises
      const newAssetsPromises = missingAssets.map((asset) => {
        if (asset.ticker === "TRY") {
          // Directly generate the TRY asset
          const newTryAsset = new Asset({
            ticker: "TRY",
            market: AssetMarket.Exchange,
            name: "Türk Lirası",
            price: {
              [Currency.EUR]: 1 / eurExchange.price, // 1 TRY = X EUR
              [Currency.USD]: 1 / usdExchange.price, // 1 TRY = X USD
              [Currency.TRY]: 1, // 1 TRY = 1 TRY
            },
            currency: Currency.TRY,
            icon: getCountryFlag("TRY"),
            scrapedAt: new Date(),
          });
          newAssets.push(newTryAsset);
          return newTryAsset.save();
        } else if (asset.ticker === "EUR" || asset.ticker === "USD") {
          // For EUR and USD, use the exchange data directly
          const exchange = asset.ticker === "EUR" ? eurExchange : usdExchange;
          const newAsset = new Asset({
            ticker: asset.ticker,
            market: AssetMarket.Exchange,
            name: exchange.name,
            price: {
              [Currency.EUR]: eurExchange.price, // 1 EUR in TRY
              [Currency.USD]: usdExchange.price, // 1 USD in TRY
              [Currency.TRY]: exchange.price, // 1 EUR/USD in TRY
            },
            currency: Currency.TRY,
            icon: exchange.icon,
            scrapedAt: new Date(),
          });
          newAssets.push(newAsset);
          return newAsset.save();
        }
      });

      // Execute all the asset creation tasks concurrently
      await Promise.all(newAssetsPromises);
    }
  }

  // Return both existing and newly created assets
  return [...existingAssets, ...newAssets];
};

export const getExchangeRates = async () => {
  // Fetch the USD and EUR assets from the database to get their TRY price
  const [EURAsset, USDAsset] = await getCurrencyAssets();

  if (!USDAsset?.price.try || !EURAsset?.price.try) {
    return { usdRate: 1, eurRate: 1 };
  }

  // Extract the conversion rates for USD and EUR to TRY
  const usdRate = USDAsset.price.try;
  const eurRate = EURAsset.price.try;

  return { usdRate, eurRate };
};

// Fetch data for a specific market
const fetchMarketDataForSpecificMarket = async (market: AssetMarket) => {
  // Fetch the USD and EUR assets from the database to get their TRY price
  const { usdRate, eurRate } = await getExchangeRates();

  switch (market) {
    case AssetMarket.USAStock:
      const usaStocks = await fetchUsaStocks();
      await updateAssetPrices(
        usaStocks,
        AssetMarket.USAStock,
        usdRate,
        eurRate
      );
      return { usaStocks };

    case AssetMarket.TRStock:
      const trStocks = await fetchTRStocks();
      await updateAssetPrices(trStocks, AssetMarket.TRStock, usdRate, eurRate);
      return { trStocks };

    case AssetMarket.Crypto:
      const crypto = await priceProvider(Market.Crypto);
      await updateAssetPrices(crypto, AssetMarket.Crypto, usdRate, eurRate);
      return { crypto };

    case AssetMarket.Commodity:
      const commodities = await scrapeGoldPrices();
      await updateAssetPrices(
        commodities,
        AssetMarket.Commodity,
        usdRate,
        eurRate
      );
      return { commodities };

    case AssetMarket.Exchange:
      const exchange = await fetchExchange();
      await updateAssetPrices(exchange, AssetMarket.Exchange, usdRate, eurRate);
      return { exchange };

    case AssetMarket.Fund:
      const funds = await fetchFunds();
      await updateAssetPrices(funds, AssetMarket.Fund, usdRate, eurRate);
      return { funds };

    case AssetMarket.Indicies:
      const indicies = await fetchIndices();
      await updateAssetPrices(indicies, AssetMarket.Indicies, usdRate, eurRate);
      return { indicies };

    default:
      throw new Error(`Unknown market type: ${market}`);
  }
};

// @desc      Get all market data or data for a specific market
// @route     GET /api/v1/scraping/setter
// @access    Public
export const priceSetter = asyncHandler(
  async (req: Request, res: Response, next: Function): Promise<void> => {
    const { market } = req.query; // Get the market query parameter

    if (market && !Object.values(AssetMarket).includes(market as AssetMarket)) {
      return next(new ErrorResponse(`Invalid market type provided`, 400));
    }

    const assets = await fetchMarketDataForSpecificMarket(
      market as AssetMarket
    );

    // Return the updated asset data in the response
    res.status(200).json({
      message: "Asset prices updated successfully",
      data: assets, // Send the updated assets in the response
    });
  }
);
