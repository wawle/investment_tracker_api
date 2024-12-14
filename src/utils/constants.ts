import { createCountryFlagUrl } from ".";
import { AssetMarket, Market } from "./enums";

export default {
  market_list: [
    {
      url: "https://tr.tradingview.com/symbols/DJ-DJI/components",
      market: Market.DownJones,
    },
    {
      url: "https://tradingview.com/markets/cryptocurrencies/prices-all",
      market: Market.Crypto,
    },
    {
      url: "https://tr.tradingview.com/symbols/NASDAQ-NDX/components",
      market: Market.Nasdaq,
    },
    {
      url: "https://tr.tradingview.com/symbols/BIST-XU100/components",
      market: Market.Bist100,
    },
    {
      url: "https://tr.tradingview.com/symbols/SPX/components/?exchange=SP",
      market: Market.SP500,
    },
    {
      url: "https://www.tradingview.com/markets/stocks-usa/sectorandindustry-industry/electronic-production-equipment",
      market: Market.Electronic,
    },
    {
      url: "https://tr.tradingview.com/markets/etfs/funds-highest-aum-growth",
      market: Market.ETF,
    },
    {
      url: "https://tr.tradingview.com/markets/stocks-usa/sectorandindustry-industry/investment-trusts-mutual-funds",
      market: Market.USAFund,
    },
    {
      url: "https://tr.tradingview.com/markets/stocks-usa/sectorandindustry-industry/finance-rental-leasing",
      market: Market.USAFund,
    },
    {
      url: "https://tr.tradingview.com/markets/stocks-turkey/sectorandindustry-sector/technology-services",
      market: Market.TRTechnology,
    },
    {
      url: "https://www.tradingview.com/markets/stocks-turkey/sectorandindustry-industry/investment-banks-brokers",
      market: Market.TRBankBroker,
    },
    {
      url: "https://www.tradingview.com/markets/stocks-turkey/sectorandindustry-sector/finance",
      market: Market.TRFinance,
    },
  ],
  asset_type_list: [
    { name: "TR Hisse Senetleri", type: AssetMarket.TRStock },
    { name: "USA Hisse Senetleri", type: AssetMarket.USAStock },
    { name: "Emtia", type: AssetMarket.Commodity },
    { name: "Döviz", type: AssetMarket.Exchange },
    { name: "Fonlar", type: AssetMarket.Fund },
    { name: "Kripto", type: AssetMarket.Crypto },
  ],
  countries: [
    {
      name: "Turkey",
      flag: createCountryFlagUrl("/5/5f/Flag_of_Turkey.svg"),
      currency: "TRY", // Turkish Lira
    },
    {
      name: "Eurozone (Euro)",
      flag: createCountryFlagUrl("/b/b7/Flag_of_Europe.svg"),
      currency: "EUR", // Euro
    },
    {
      name: "United States of America",
      flag: createCountryFlagUrl("/a/a4/Flag_of_the_United_States.svg"),
      currency: "USD", // US Dollar
    },
    {
      name: "Switzerland",
      flag: createCountryFlagUrl("/f/f3/Flag_of_Switzerland.svg"),
      currency: "CHF", // Swiss Franc
    },
    {
      name: "United Kingdom",
      flag: createCountryFlagUrl(
        "/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg"
      ),
      currency: "GBP", // British Pound
    },
    {
      name: "Japan",
      flag: createCountryFlagUrl("/9/9e/Flag_of_Japan.svg"),
      currency: "JPY", // Japanese Yen
    },
    {
      name: "Australia",
      flag: createCountryFlagUrl("/8/88/Flag_of_Australia_(converted).svg"),
      currency: "AUD", // Australian Dollar
    },
    {
      name: "Denmark",
      flag: createCountryFlagUrl("/9/9c/Flag_of_Denmark.svg"),
      currency: "DKK", // Danish Krone
    },
    {
      name: "Canada",
      flag: createCountryFlagUrl("/c/cf/Flag_of_Canada.svg"),
      currency: "CAD", // Canadian Dollar
    },
    {
      name: "Norway",
      flag: createCountryFlagUrl("/d/d9/Flag_of_Norway.svg"),
      currency: "NOK", // Norwegian Krone
    },
    {
      name: "Sweden",
      flag: createCountryFlagUrl("/4/4c/Flag_of_Sweden.svg"),
      currency: "SEK", // Swedish Krona
    },
    {
      name: "Saudi Arabia",
      flag: createCountryFlagUrl("/0/0d/Flag_of_Saudi_Arabia.svg"),
      currency: "SAR", // Saudi Riyal
    },
    {
      name: "Kuwait",
      flag: createCountryFlagUrl("/a/aa/Flag_of_Kuwait.svg"),
      currency: "KWD", // Kuwaiti Dinar
    },
    {
      name: "Qatar",
      flag: createCountryFlagUrl("/6/65/Flag_of_Qatar.svg"),
      currency: "QAR", // Qatari Riyal
    },
    {
      name: "Bahrain",
      flag: createCountryFlagUrl("/2/2c/Flag_of_Bahrain.svg"),
      currency: "BHD", // Bahraini Dinar
    },
    {
      name: "Mexico",
      flag: createCountryFlagUrl("/f/fc/Flag_of_Mexico.svg"),
      currency: "MXN", // Mexican Peso
    },
    {
      name: "South Africa",
      flag: createCountryFlagUrl("/4/4f/Flag_of_South_Africa.svg"),
      currency: "ZAR", // South African Rand
    },
    {
      name: "China",
      flag: createCountryFlagUrl("/f/f0/Flag_of_China.svg"),
      currency: "CNY", // Chinese Yuan
    },
    {
      name: "India",
      flag: createCountryFlagUrl("/4/41/Flag_of_India.svg"),
      currency: "INR", // Indian Rupee
    },
    {
      name: "Singapore",
      flag: createCountryFlagUrl("/0/01/Flag_of_Singapore.svg"),
      currency: "SGD", // Singapore Dollar
    },
    {
      name: "Hong Kong",
      flag: createCountryFlagUrl("/5/5f/Flag_of_Hong_Kong.svg"),
      currency: "HKD", // Hong Kong Dollar
    },
    {
      name: "South Korea",
      flag: createCountryFlagUrl("/0/09/Flag_of_South_Korea.svg"),
      currency: "KRW", // South Korean Won
    },
    {
      name: "Taiwan",
      flag: createCountryFlagUrl("/8/80/Flag_of_Taiwan.svg"),
      currency: "TWD", // New Taiwan Dollar
    },
    {
      name: "Indonesia",
      flag: createCountryFlagUrl("/9/9f/Flag_of_Indonesia.svg"),
      currency: "IDR", // Indonesian Rupiah
    },
    {
      name: "Malaysia",
      flag: createCountryFlagUrl("/6/66/Flag_of_Malaysia.svg"),
      currency: "MYR", // Malaysian Ringgit
    },
    {
      name: "Philippines",
      flag: createCountryFlagUrl("/9/99/Flag_of_the_Philippines.svg"),
      currency: "PHP", // Philippine Peso
    },
    {
      name: "Thailand",
      flag: createCountryFlagUrl("/1/1e/Flag_of_Thailand.svg"),
      currency: "THB", // Thai Baht
    },
  ],
};
