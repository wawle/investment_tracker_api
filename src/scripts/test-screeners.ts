import { fetchEtf, fetchStocks, fetchCrypto } from "../utils/scrapers";

async function run() {
  const sections = [
    //{ name: "ETF", fn: fetchEtf },
    //{ name: "Stocks", fn: fetchStocks },
    { name: "Crypto", fn: fetchCrypto },
  ];

  for (const { name, fn } of sections) {
    const start = Date.now();
    const data = await fn();
    const sec = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`${name}: ${data.length} rows in ${sec}s`);
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
