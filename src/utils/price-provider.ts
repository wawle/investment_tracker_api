import constants from "./constants";
import puppeteer from 'puppeteer';


export const priceProvider = async (market: string, search: string) => {
    const browser = await puppeteer.launch({headless: true,args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // Tarayıcıyı başlat
    const page = await browser.newPage(); // Yeni bir sayfa oluştur
    const url = constants.market_list.find((item) => item.market === market)?.url;

    if (!url) return [];

    await page.goto(url, { waitUntil: 'domcontentloaded' });
  
    // Extract ticker names and prices from the table
    const data = await page.evaluate((search: string) => {
      // Find all rows in the table
      const rows = document.querySelectorAll('tr'); // Adjust selector if needed
      
      const result: any[] = [];
  
      // Iterate over rows to get ticker and price
      rows.forEach((row) => {
        // Extract ticker symbol (assuming it's in the first column)
        const tickerElement: any = row.querySelector('.tickerNameBox-GrtoTeat');
        const tickerName = tickerElement ? tickerElement.innerText.trim() : null;
  
        // If a ticker name exists, filter it based on the search query
        if (tickerName && (!search || tickerName.toLowerCase().includes(search.toLowerCase()))) {
          // Extract the price from the column specified by priceIndex
          const priceCell: any = row.querySelectorAll('td')[2];  // Access the specified column by index
          if (priceCell) {
            const priceText = priceCell.innerText.trim();
  
            // If both ticker name and price exist, push them into the result array
            if (priceText) {
              const [price, currency] = priceText.split(" ");
              result.push({
                ticker: tickerName,
                price: price,
                currency: currency,
              });
            }
          }
        }
      });
  
      return result;
    }, search); // Pass the search parameter to page.evaluate()
  
    await browser.close(); // Tarayıcıyı kapat
    return data
  };