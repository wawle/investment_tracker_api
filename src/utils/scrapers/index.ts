import { fetchScreener } from "./screener";

type ScreenerRow = {
  ticker: string;
  name: string;
  icon: string | null;
  price: number | null;
  change: number | null;
};

export async function fetchEtf(): Promise<ScreenerRow[]> {
  return fetchScreener("https://www.tradingview.com/etf-screener/");
}

export async function fetchStocks(): Promise<ScreenerRow[]> {
  return fetchScreener("https://www.tradingview.com/screener/");
}

export async function fetchCrypto(): Promise<ScreenerRow[]> {
  return fetchScreener("https://www.tradingview.com/crypto-coins-screener/");
}

export default { fetchEtf, fetchStocks, fetchCrypto };
