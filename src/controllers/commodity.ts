import { Request } from "express";
import asyncHandler from "../middleware/async";
import puppeteer from "puppeteer";
import { generateCode, parsePrice } from "../utils";

// @desc      Get all commodities
// @route     GET /api/v1/commodities
// @access    Public
export const getCommodities = asyncHandler(
  async (req: Request, res: any): Promise<void> => {
    const { search } = req.query;
    const commodities = await scrapeGoldPrices();

    // If there is a search term, filter the results
    let filteredCommodities = search
      ? commodities.filter((item: any) =>
          item.name.toLowerCase().includes((search as string).toLowerCase())
        )
      : commodities;

    res.status(200).json({
      success: true,
      data: filteredCommodities,
    });
  }
);

export async function scrapeGoldPrices() {
  // Launch the browser and open a new page
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 3600000,
  }); // Set headless: false if you want to see the browser
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto("https://bigpara.hurriyet.com.tr/altin/ata-altin-fiyati/", {
    timeout: 0,
    waitUntil: "domcontentloaded",
  });

  // Wait for the page to load and the required elements to appear
  await page.waitForSelector(".tBody");

  // Scrape the gold prices
  const prices = await page.$$eval(".tBody ul", (uls) => {
    return uls
      .map((ul: any) => {
        const name =
          ul.querySelector(".cell010 a")?.textContent.trim() ||
          ul.querySelector(".cell010 b")?.textContent.trim(); // Extract name
        const alis = ul.querySelectorAll(".cell009")[0]?.textContent.trim(); // Extract alış price
        const satis = ul.querySelectorAll(".cell009")[1]?.textContent.trim(); // Extract satış price
        const convertedPrice = parseFloat(
          satis.replace(".", "").replace(",", ".")
        );
        return { name, alis, satis, price: convertedPrice };
      })
      .filter(
        (item) =>
          item.price !== null &&
          item.price !== undefined &&
          !item.name.includes("Euro") &&
          !item.name.includes("$") &&
          !item.name.includes("EURO")
      ); // Filter out invalid 'price' values
  });

  // Close the browser
  await browser.close();

  // Track already generated codes
  const generatedCodes = new Set<string>();

  // Add unique code to each item
  const updatedPrices = prices.map((item, index) => {
    let code = generateCode(item.name); // Generate base code

    // Ensure code is unique by appending a number if it already exists
    let uniqueCode = code;
    let counter = 1;
    while (generatedCodes.has(uniqueCode)) {
      uniqueCode = `${code}${counter}`; // Append a number to the base code
      counter++;
    }

    // Add the unique code to the set and the item
    generatedCodes.add(uniqueCode);

    return { ...item, ticker: uniqueCode };
  });
  return updatedPrices;
}
