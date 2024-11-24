

import axios from 'axios';
import * as xml2js from 'xml2js';
import asyncHandler from '../middleware/async';
import { NextFunction, Request, Response } from 'express';



export const getExchanges = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { search  } = req.query;
  const exchanges = await fetchExchange();

   // If there is a search term, filter the results
   const filteredExchanges = search ? exchanges.filter((exchange: any) => 
    exchange.name.toLowerCase().includes((search as string).toLowerCase()) || 
    exchange.code.toLowerCase().includes((search as string).toLowerCase()) || 
    exchange.currency_name.toLowerCase().includes((search as string).toLowerCase())
  ) : exchanges;

    res.status(200).json({
        success: true,
        data: filteredExchanges
      });
  });


  export const getExchangeRates = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const exchanges = await fetchExchangeRates();
  
      res.status(200).json({
          success: true,
          data: exchanges
        });
    });



  // TCMB'nin döviz kuru verilerini almak için XML URL'si
const url = 'https://www.tcmb.gov.tr/kurlar/today.xml';

// Döviz kuru verisini alıp JSON formatına dönüştüren fonksiyon

  export const fetchExchangeRates = async() => {
    const response = await axios.get(url);

    // XML'i JSON'a dönüştürmek için xml2js kullan
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    // Döviz kuru verilerini içeren bölüm
    const exchangeRates = result.Tarih_Date.Currency;



    // USD/TRY kuru örneği
    const usdRate = exchangeRates.find((currency: any) => currency['$'].CurrencyCode === 'USD')?.BanknoteSelling;
    const eurRate = exchangeRates.find((currency: any) => currency['$'].CurrencyCode === 'EUR')?.BanknoteSelling;
    const usdToTry = Number(usdRate); // USD/TRY kuru
    const eurToTry = Number(eurRate); // EUR/TRY kuru

    return  {try: 1, eur:Number(eurRate), usd: Number(usdRate),  eurToUsd: eurToTry / usdToTry }
  }

  export const fetchExchange = async() => {
    const response = await axios.get(url);

    // XML'i JSON'a dönüştürmek için xml2js kullan
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

     // Döviz kuru verilerini içeren bölüm
     const exchangeRates = result.Tarih_Date.Currency;

    const exchange = exchangeRates?.map((item: any) => ({
      code: item['$'].CurrencyCode,
      name: item.Isim,
      currency_name: item.CurrencyName,
      buy: item.BanknoteBuying,
      sell: item.BanknoteSelling
    }))

    return  exchange
  }