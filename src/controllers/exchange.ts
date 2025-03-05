import axios from "axios";
import * as xml2js from "xml2js";
import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import { getCountryFlag } from "../utils";
import { getCurrencyRates } from "../utils/currency-converter";
import { getRateValues } from "../utils/rate-handler";

export const fetchExchange = async (): Promise<
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
      ticker: item["$"].CurrencyCode,
      name: item.Isim,
      currency_name: item.CurrencyName,
      buy: item.BanknoteBuying,
      sell: item.BanknoteSelling,
      price: parseFloat(item.BanknoteSelling.replace(",", ".")),
      icon: getCountryFlag(item["$"].CurrencyCode),
    }))
    .filter(
      (item: {
        ticker: string;
        name: string;
        currency_name: string;
        buy: string;
        sell: string;
      }) => item.sell !== "" && item.sell !== null && item.sell !== undefined
    ); // Filter out invalid 'sell' values

  return exchange;
};

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
            exchange.ticker
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

// @desc      Get all exchange
// @route     GET /api/v1/exchange/rates
// @access    Public
export const getExchangeRates = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { usdRate, eurRate } = await getRateValues();
    const rates = getCurrencyRates(usdRate, eurRate);

    res.status(200).json({
      success: true,
      data: rates,
    });
  }
);
