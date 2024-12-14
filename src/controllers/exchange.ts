import axios from "axios";
import * as xml2js from "xml2js";
import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import { Currency } from "../utils/enums";

// @desc      Get all exchange
// @route     GET /api/v1/exchange
// @access    Public
export const getExchanges = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { search } = req.query;
    const exchanges = await fetchExchange();

    // If there is a search term, filter the results
    const filteredExchanges = search
      ? exchanges.filter(
          (exchange: any) =>
            exchange.name
              .toLowerCase()
              .includes((search as string).toLowerCase()) ||
            exchange.code
              .toLowerCase()
              .includes((search as string).toLowerCase()) ||
            exchange.currency_name
              .toLowerCase()
              .includes((search as string).toLowerCase())
        )
      : exchanges;

    res.status(200).json({
      success: true,
      data: filteredExchanges,
    });
  }
);

export const getExchangeRates = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const exchanges = await fetchExchangeRates();

    res.status(200).json({
      success: true,
      data: exchanges,
    });
  }
);

// TCMB'nin döviz kuru verilerini almak için XML URL'si
const url = "https://www.tcmb.gov.tr/kurlar/today.xml";

// Döviz kuru verisini alıp JSON formatına dönüştüren fonksiyon
// Fetch exchange rates for USD, EUR, and TRY
export const fetchExchangeRates = async () => {
  const response = await axios.get(url);

  // XML to JSON conversion
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(response.data);

  const exchangeRates = result.Tarih_Date.Currency;

  // Find specific currency exchange rates
  const usdRate = exchangeRates.find(
    (currency: any) => currency["$"].CurrencyCode === "USD"
  )?.BanknoteSelling;
  const eurRate = exchangeRates.find(
    (currency: any) => currency["$"].CurrencyCode === "EUR"
  )?.BanknoteSelling;

  const usdToTry = Number(usdRate); // USD/TRY rate
  const eurToTry = Number(eurRate); // EUR/TRY rate

  // Return exchange rates to and from TRY, USD, EUR
  return {
    try: usdToTry,
    eur: usdToTry / eurToTry,
    usd: 1,
    from: {
      try: 1,
      usd: 1 / usdToTry,
      eur: 1 / eurToTry,
    },
  };
};

// Function to fetch asset exchange rates from the asset database
// export const fetchAssetExchangeRates = async () => {
//   // Fetch all assets from the database that are of type 'Exchange'
//   const assets = await Asset.find({ market: AssetMarket.Exchange });

//   // Initialize the assetRates object for only TRY, EUR, and USD
//   const assetRates: Record<Currency, Record<Currency, number>> = {
//     [Currency.TRY]: { [Currency.TRY]: 1, [Currency.EUR]: 0, [Currency.USD]: 0 },
//     [Currency.EUR]: { [Currency.TRY]: 0, [Currency.EUR]: 1, [Currency.USD]: 0 },
//     [Currency.USD]: { [Currency.TRY]: 0, [Currency.EUR]: 0, [Currency.USD]: 1 },
//   };

//   // Loop through each asset and update the conversion rates
//   for (const asset of assets) {
//     const { ticker, price } = asset;

//     if (ticker.toLowerCase() === Currency.TRY) {
//       // If the asset is in TRY, we know 1 TRY = price in TRY
//       assetRates[Currency.TRY][Currency.TRY] = price; // 1 TRY = price in TRY
//     }

//     if (ticker.toLowerCase() === Currency.USD) {
//       // If the asset is in USD, 1 USD = price in TRY
//       assetRates[Currency.USD][Currency.TRY] = price; // 1 USD = price in TRY
//     }

//     if (ticker.toLowerCase() === Currency.EUR) {
//       // If the asset is in EUR, 1 EUR = price in TRY
//       assetRates[Currency.EUR][Currency.TRY] = price; // 1 EUR = price in TRY
//     }
//   }

//   // Now that we have the prices in TRY, calculate cross-currency rates
//   for (const fromCurrency of [Currency.TRY, Currency.EUR, Currency.USD]) {
//     for (const toCurrency of [Currency.TRY, Currency.EUR, Currency.USD]) {
//       if (
//         fromCurrency !== toCurrency &&
//         assetRates[fromCurrency][Currency.TRY] !== 0 &&
//         assetRates[toCurrency][Currency.TRY] !== 0
//       ) {
//         // Calculate cross-currency exchange rates using the TRY base
//         assetRates[fromCurrency][toCurrency] =
//           assetRates[toCurrency][Currency.TRY] /
//           assetRates[fromCurrency][Currency.TRY];
//       }
//     }
//   }

//   return assetRates;
// };

// Function to get the conversion rate between two currencies
export const getCurrencyConversionRate = async (
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> => {
  // Fetch the latest exchange rates
  const response = await fetchExchangeRates();

  let rate = 1;

  // Conversion logic based on fromCurrency and toCurrency
  if (fromCurrency === Currency.TRY) {
    rate = response.from[toCurrency]; // TRY to target currency
  } else if (toCurrency === Currency.TRY) {
    rate = 1 / response.from[fromCurrency]; // Convert to TRY if target is TRY
  } else {
    rate = response[toCurrency] / response[fromCurrency]; // Any other pair
  }

  if (!rate) {
    throw new Error(
      `Conversion rate from ${fromCurrency} to ${toCurrency} not found.`
    );
  }

  return rate;
};
// Function to get the conversion rate between two currencies using asset prices
// export const getCurrencyConversionRate = async (
//   fromCurrency: Currency,
//   toCurrency: Currency
// ): Promise<number> => {
//   // Fetch the asset data for the specific currencies
//   const assetRates = await fetchExchangeRates();
//   console.log({ assetRates });
//   // Check if the asset data contains the necessary conversion rates
//   let rate = 1;

//   if (fromCurrency === toCurrency) {
//     return 1; // Same currency, no conversion needed
//   }

//   // Conversion logic based on asset prices
//   if (fromCurrency === Currency.TRY) {
//     rate = assetRates[fromCurrency][toCurrency];
//   } else if (toCurrency === Currency.TRY) {
//     rate = 1 / assetRates[toCurrency][fromCurrency];
//   } else {
//     rate =
//       assetRates[fromCurrency][Currency.TRY] /
//       assetRates[toCurrency][Currency.TRY];
//   }

//   if (!rate) {
//     throw new Error(
//       `Conversion rate from ${fromCurrency} to ${toCurrency} not found.`
//     );
//   }

//   return rate;
// };

export const fetchExchange = async (): Promise<
  {
    code: string;
    name: string;
    currency_name: string;
    buy: string;
    sell: string;
  }[]
> => {
  const response = await axios.get(url);

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
