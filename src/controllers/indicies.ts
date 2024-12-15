import puppeteer from "puppeteer";
import constants from "../utils/constants";
import asyncHandler from "../middleware/async";
import { Market } from "../utils/enums";

// @desc      Get all indicies
// @route     GET /api/v1/indicies
// @access    Public
export const getIndicies = asyncHandler(
  async (req: any, res: any): Promise<void> => {
    const indicies = await fetchIndices();

    res.status(200).json({
      success: true,
      data: indicies,
    });
  }
);

export const fetchIndices = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const url = constants.market_list.find(
      (item) => item.market === Market.Indicies
    )?.url;

    if (!url) return [];

    await page.goto(url, { timeout: 0, waitUntil: "networkidle0" });

    // Helper function for delay
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

          await page.waitForFunction(
            () => {
              const currentRows = document.querySelectorAll("tr").length;
              return currentRows > 0; // Adjust this condition as needed
            },
            { timeout: 5000 }
          );

          await delay(1000);

          return (await page.$("button span.content-D4RPB3ZC")) !== null;
        }
      }

      return false;
    }

    let hasMoreData = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 10;

    while (hasMoreData && iterationCount < MAX_ITERATIONS) {
      hasMoreData = await loadMoreData();
      iterationCount++;
    }

    // Extract ticker names and prices from the table
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll("tr");

      const result: {
        ticker: string;
        price: number;
        currency: string;
        icon: string | null;
        name: string;
      }[] = [];

      rows.forEach((row) => {
        const tickerElement: any = row.querySelector(".tickerNameBox-GrtoTeat");
        const tickerName = tickerElement
          ? tickerElement.innerText.trim()
          : null;

        if (tickerName) {
          const tickerDescriptionElement: any = row.querySelector(
            ".tickerDescription-GrtoTeat"
          );
          const tickerDescription = tickerDescriptionElement
            ? tickerDescriptionElement.innerText.trim()
            : null;

          const iconElement = row.querySelector(".tickerLogo-GrtoTeat");
          const iconSrc = iconElement
            ? (iconElement as HTMLImageElement).src
            : null;

          const priceCell: any = row.querySelectorAll("td")[1];
          if (priceCell) {
            const priceText = priceCell.innerText.trim();
            if (priceText) {
              const sanitizedPrice = priceText.replace(/,/g, "");
              const updatedPrice = parseFloat(sanitizedPrice);
              result.push({
                ticker: tickerName,
                price: updatedPrice,
                currency: "usd", // Always "usd"
                icon: iconSrc,
                name: tickerDescription,
              });
            }
          }
        }
      });

      return Array.from(
        new Map(result.map((item) => [item.ticker, item])).values()
      );
    });

    return data;
  } catch (error) {
    console.error("Error in fetchIndices:", error);
    return [];
  } finally {
    await browser.close();
  }
};
