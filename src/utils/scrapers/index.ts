import { fetchScreener, ScreenerRow } from "./screener";

export async function fetchEtf(): Promise<ScreenerRow[]> {
  // sectorIndex: ETF sector column is at td index 9 (0-based)
  return fetchScreener("https://www.tradingview.com/etf-screener/", {
    sectorIndex: 8,
  });
}

export async function fetchStocks(): Promise<ScreenerRow[]> {
  // sectorIndex: Stocks sector is at td index 10
  return fetchScreener("https://www.tradingview.com/screener/", {
    sectorIndex: 10,
  });
}

export async function fetchCrypto(): Promise<ScreenerRow[]> {
  // sectorIndex: Crypto sector-like category is at td index 7
  return fetchScreener("https://www.tradingview.com/crypto-coins-screener/", {
    sectorIndex: 9,
  });
}

export default { fetchEtf, fetchStocks, fetchCrypto };
