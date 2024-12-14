import constants from "./constants";
import puppeteer from "puppeteer";
import { Currency } from "./enums";

export const priceProvider = async (market: string) => {
  const allowedCurrencies = [Currency.TRY, Currency.USD];

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }); // Launch browser

  try {
    const page = await browser.newPage(); // Create new page
    const url = constants.market_list.find(
      (item) => item.market === market
    )?.url;

    if (!url) return [];

    await page.goto(url, { timeout: 0, waitUntil: "networkidle0" });

    // Helper function to create a delay
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Function to load more data dynamically
    async function loadMoreData() {
      const loadMoreButton = await page.$(
        "button span.content-D4RPB3ZC" // Adjust the selector to target the text container
      );

      if (loadMoreButton) {
        const buttonText = await page.evaluate(
          (button) => button.innerText.trim(),
          loadMoreButton
        );

        if (buttonText === "Load More") {
          console.log("Load more button found. Clicking...");
          await loadMoreButton.click();

          // Wait for new data to load using page.waitForFunction
          await page.waitForFunction(
            () => {
              const currentRows = document.querySelectorAll("tr").length;
              return currentRows > 0; // Adjust this condition as needed
            },
            { timeout: 5000 }
          );

          // Additional small delay
          await delay(1000);

          // Check if there are more items to load
          return (await page.$("button span.content-D4RPB3ZC")) !== null;
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
    const data = await page.evaluate(
      (allowedCurrencies: string[]) => {
        // Find all rows in the table
        const rows = document.querySelectorAll("tr"); // Adjust selector if needed

        const result: {
          ticker: string;
          price: string;
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
                  allowedCurrencies.includes(currency.toLowerCase() as Currency)
                ) {
                  result.push({
                    ticker: tickerName,
                    price: price,
                    currency: currency,
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
    return [];
  } finally {
    await browser.close(); // Always close the browser
  }
};
