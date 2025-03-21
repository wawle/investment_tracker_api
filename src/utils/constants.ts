import { createCountryFlagUrl } from ".";
import { AssetMarket, Market } from "./enums";

export default {
  market_list: [
    {
      url: "https://tradingview.com/symbols/DJ-DJI/components",
      market: Market.DownJones,
    },
    {
      url: "https://tradingview.com/markets/cryptocurrencies/prices-all",
      market: Market.Crypto,
    },
    {
      url: "https://tradingview.com/symbols/NASDAQ-NDX/components",
      market: Market.Nasdaq,
    },
    {
      url: "https://tradingview.com/symbols/BIST-XU100/components",
      market: Market.Bist100,
    },
    {
      url: "https://tradingview.com/symbols/SPX/components/?exchange=SP",
      market: Market.SP500,
    },
    {
      url: "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/electronic-production-equipment",
      market: Market.Electronic,
    },
    {
      url: "https://tradingview.com/markets/etfs/funds-highest-aum-growth",
      market: Market.ETF,
    },
    {
      url: "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/investment-trusts-mutual-funds",
      market: Market.USAFund,
    },
    {
      url: "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/finance-rental-leasing",
      market: Market.FinanceRental,
    },
    {
      url: "https://tradingview.com/markets/stocks-turkey/sectorandindustry-sector/technology-services",
      market: Market.TRTechnology,
    },
    {
      url: "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/investment-banks-brokers",
      market: Market.TRBankBroker,
    },
    {
      url: "https://tradingview.com/markets/stocks-turkey/sectorandindustry-sector/finance",
      market: Market.TRFinance,
    },
    {
      url: "https://tradingview.com/symbols/BIST-XTUMY/components",
      market: Market.TRTum100,
    },
    {
      url: "https://tradingview.com/markets/indices/quotes-all",
      market: Market.Indicies,
    },
  ],
  asset_type_list: [
    { name: "TR Hisseleri", type: AssetMarket.TRStock },
    { name: "USA Hisseleri", type: AssetMarket.USAStock },
    { name: "Emtia", type: AssetMarket.Commodity },
    { name: "Döviz", type: AssetMarket.Exchange },
    { name: "Fonlar", type: AssetMarket.Fund },
    { name: "Kripto paralar", type: AssetMarket.Crypto },
    { name: "Endeksler", type: AssetMarket.Indicies },
  ],
  countries: [
    {
      name: "Turkey",
      flag: createCountryFlagUrl("/b/b4/Flag_of_Turkey.svg"),
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
  tradingview_endpoints: {
    markets: {
      indicies: {
        all: "https://tradingview.com/markets/indices/quotes-all",
      },
      tr: {
        stocks: {
          all: "https://tradingview.com/markets/stocks-turkey/market-movers-all-stocks",
          bist100: "https://tradingview.com/symbols/BIST-XU100/components",
          bist30: "https://www.tradingview.com/symbols/BIST-XU030/components",
          bist50: "https://tradingview.com/symbols/BIST-XU50/components",
          tum100: "https://tradingview.com/symbols/BIST-XTUMY/components",
          finance:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-sector/finance",
          bankBroker:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/investment-banks-brokers",
          technology:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-sector/technology-services",
          industry:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/investment-trusts-mutual-funds",
          electronic:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/electronic-production-equipment",
          logistics:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/logistics",
          energy:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/energy",
          healthcare:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/healthcare",
          realEstate:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/real-estate",
          consumer:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/consumer-goods",
          industrials:
            "https://tradingview.com/markets/stocks-turkey/sectorandindustry-industry/industrials",
        },
      },
      usa: {
        stocks: {
          all: "https://tradingview.com/markets/stocks-usa/market-movers-all-stocks/",
          nasdaq: "https://tradingview.com/symbols/NASDAQ-NDX/components",
          sp500: "https://tradingview.com/symbols/SPX/components/?exchange=SP",
          dowJones: "https://tradingview.com/symbols/DJ-DJI/components",
          tech: "https://tradingview.com/markets/stocks-usa/sectorandindustry-sector/technology",
          finance:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-sector/finance",
          industry:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/investment-trusts-mutual-funds",
          consumer:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/consumer-goods",
          industrials:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/industrials",
          energy:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/energy",
          healthcare:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/healthcare",
          realEstate:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/real-estate",
          utilities:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/utilities",
          telecom:
            "https://tradingview.com/markets/stocks-usa/sectorandindustry-industry/telecom",
        },
        etf: {
          all: "https://www.tradingview.com/markets/etfs/funds-usa/",
        },
      },
      crypto: {
        all: "https://www.tradingview.com/markets/cryptocurrencies/prices-all",
      },
    },
  },
};
