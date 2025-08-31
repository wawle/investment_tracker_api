import constants from "./constants";
import puppeteer, { Browser, Page } from "puppeteer";
import { Currency } from "./enums";
import BrowserPool from "./browser-pool";

export const priceProvider = async (market: string) => {
  const allowedCurrencies = [Currency.TRY, Currency.USD];
  const browserPool = BrowserPool.getInstance();
  let browser: Browser;
  let page: Page | null = null;

  try {
    browser = await browserPool.getBrowser();
    page = await browser.newPage(); // Create new page

    // Bellek kullanımını azaltmak için sayfa ayarları
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      // Allow images for icon extraction, but block other unnecessary resources
      if (["stylesheet", "font"].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const url = constants.market_list.find(
      (item) => item.market === market
    )?.url;

    if (!url) return [];

    await page.goto(url, { timeout: 60000, waitUntil: "networkidle0" });

    // Helper function to create a delay
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Function to load more data dynamically
    async function loadMoreData() {
      const loadMoreButton = await page?.$(
        "button span.content-D4RPB3ZC" // Adjust the selector to target the text container
      );

      if (loadMoreButton) {
        const buttonText = await page?.evaluate(
          (button: HTMLElement) => button.innerText.trim(),
          loadMoreButton
        );

        if (buttonText === "Load More") {
          await loadMoreButton.click();

          // Wait for new data to load using page.waitForFunction
          await page?.waitForFunction(
            () => {
              const currentRows = document.querySelectorAll("tr").length;
              return currentRows > 0; // Adjust this condition as needed
            },
            { timeout: 5000 }
          );

          // Additional small delay
          await delay(1000);

          // Check if there are more items to load
          return (await page?.$("button span.content-D4RPB3ZC")) !== null;
        }
      }

      return false;
    }

    // Continuously load more data
    let hasMoreData = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Prevent potential infinite loops

    while (hasMoreData && iterationCount < MAX_ITERATIONS) {
      // Try to load more data
      hasMoreData = await loadMoreData();
      iterationCount++;
    }

    // Extract ticker names and prices from the table
    const data = await page?.evaluate(
      (allowedCurrencies: string[]) => {
        // Find all rows in the table
        const rows = document.querySelectorAll("tr"); // Adjust selector if needed

        const result: {
          ticker: string;
          price: number;
          currency: string;
          icon: string | null;
          name: string;
        }[] = [];

        // Iterate over rows to get ticker and price
        rows.forEach((row) => {
          // Extract ticker symbol (assuming it's in the first column)
          const tickerElement: any = row.querySelector(
            ".tickerNameBox-GrtoTeat"
          );
          const tickerName = tickerElement
            ? tickerElement.innerText.trim()
            : null;

          // If a ticker name exists, continue processing
          if (tickerName) {
            const tickerDescriptionElement: any = row.querySelector(
              ".tickerDescription-GrtoTeat"
            );
            const tickerDescription = tickerDescriptionElement
              ? tickerDescriptionElement.innerText.trim()
              : null;

            // Extract SVG icon or image
            const iconElement = row.querySelector(".tickerLogo-GrtoTeat");
            const iconSrc = iconElement
              ? (iconElement as HTMLImageElement).src
              : null; // Get the image src if it's an image, or you can extract SVG directly

            // Extract the price from the column specified by priceIndex
            const priceCell: any = row.querySelectorAll("td")[2]; // Access the specified column by index
            if (priceCell) {
              const priceText = priceCell.innerText.trim();

              // If both ticker name and price exist, push them into the result array
              if (priceText) {
                const [price, currency] = priceText.split(" ");
                // Check if the currency is in the allowed currencies list
                if (
                  allowedCurrencies.includes(
                    currency?.toLowerCase() as Currency
                  )
                ) {
                  const sanitizedPrice = price.replace(/,/g, ""); // Remove all commas
                  const updatedPrice = parseFloat(sanitizedPrice); // Convert to float
                  result.push({
                    ticker: tickerName,
                    price: updatedPrice,
                    currency: currency?.toLowerCase() as Currency,
                    icon: iconSrc,
                    name: tickerDescription,
                  });
                }
              }
            }
          }
        });

        // Remove duplicates by ticker
        return Array.from(
          new Map(result.map((item) => [item.ticker, item])).values()
        );
      },
      allowedCurrencies.map((c) => c.toLowerCase())
    ); // Pass allowed currencies

    return data;
  } catch (error) {
    console.error("Error in priceProvider:", error);

    // Log specific error types for better debugging
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.error(
          `Navigation timeout for market: ${market} - this may indicate network issues or TradingView rate limiting`
        );
      } else if (error.message.includes("net::ERR")) {
        console.error(`Network error for market: ${market}: ${error.message}`);
      } else {
        console.error(`General error for market: ${market}: ${error.message}`);
      }
    }

    return [];
  } finally {
    if (page) {
      try {
        await page.close(); // Sayfayı kapat
      } catch (err) {
        console.error("Error closing page:", err);
      }
    }
    // Browser'ı kapatmıyoruz, havuz tarafından yönetiliyor
  }
};
