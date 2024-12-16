import { getCountryFlag } from ".";
import { AssetMarket, Currency } from "./enums";
import Asset, { IAsset } from "../models/Asset";
import { getCurrencyRates } from "./currency-converter";
import { fetchExchange } from "../controllers/exchange";
import NodeCache from "node-cache";

// Create a cache instance with a default TTL of 10 minutes (600 seconds)
const cache = new NodeCache({ stdTTL: 600 });

export const getRateValues = async (): Promise<{
  usdRate: number;
  eurRate: number;
}> => {
  // Try to get the cached exchange rates
  const cachedRates = cache.get<{ usdRate: number; eurRate: number }>(
    "exchangeRates"
  );

  if (cachedRates) {
    return cachedRates; // Return cached rates if available
  }

  // Fetch the USD and EUR assets from the database to get their TRY price
  const [EURAsset, USDAsset] = await getCurrencyAssets();

  if (!USDAsset?.price.try || !EURAsset?.price.try) {
    return { usdRate: 1, eurRate: 1 };
  }

  // Extract the conversion rates for USD and EUR to TRY
  const usdRate = USDAsset.price.try;
  const eurRate = EURAsset.price.try;

  const exchangeRates = { usdRate, eurRate };

  // Cache the result for 10 minutes (600 seconds)
  cache.set("exchangeRates", exchangeRates);

  return exchangeRates;
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
        const foundAsset = await Asset.findOne({
          market: asset.market,
          ticker: asset.ticker,
        });

        return foundAsset || null; // Return null if not found
      } catch (error) {
        return null; // Return null on error
      }
    })
  );

  // Filter out the null values (assets that weren't found)
  const existingAssetsFiltered = existingAssets.filter(
    (asset) => asset !== null
  );

  return existingAssetsFiltered;
};

export const getConvertedPrice = async (currency: Currency, price: number) => {
  const rates = await getRates();
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

export const getRates = async () => {
  const { usdRate, eurRate } = await getRateValues();
  const rates = getCurrencyRates(usdRate, eurRate);
  return rates;
};
