import { AssetType, Market } from "./enums";

export default {
    market_list: [
        {url: "https://tr.tradingview.com/symbols/DJ-DJI/components", market: Market.DownJones,},
        {url: "https://tradingview.com/markets/cryptocurrencies/prices-all", market: Market.Crypto},
        {url: "https://tr.tradingview.com/symbols/NASDAQ-NDX/components", market: Market.Nasdaq},
        {url: "https://tr.tradingview.com/symbols/BIST-XU100/components", market: Market.Bist100},
        {url: "https://tr.tradingview.com/symbols/SPX/components/?exchange=SP", market: Market.SP500},
        {url: "https://www.tradingview.com/markets/stocks-usa/sectorandindustry-industry/electronic-production-equipment", market: Market.Electronic},
      ],
      asset_type_list: [
        {name: "Hisse Senetleri", type: AssetType.Stock},
        {name: "Emtia", type: AssetType.Commodity},
        {name: "Döviz", type: AssetType.Exchange},
        {name: "Fonlar", type: AssetType.Fund},
        {name: "Kripto", type: AssetType.Crypto},
      ]
}