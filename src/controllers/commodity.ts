import { Request, NextFunction } from "express";
import asyncHandler from "../middleware/async";
import puppeteer from "puppeteer";
import { generateSlug } from "../utils";

// @desc      Get all commodities
// @route     GET /api/v1/commodities
// @access    Public
export const getCommodities = asyncHandler(
  async (req: Request, res: any, next: NextFunction): Promise<void> => {
    const { search } = req.query;
    const commodities = await scrapeGoldPrices();

    // If there is a search term, filter the results
    const filteredCommodities = search
      ? commodities.filter((item: any) =>
          item.name.toLowerCase().includes((search as string).toLowerCase())
        )
      : commodities;

    // Add slug to each item in the list
    const updatedDataList = filteredCommodities.map((item) => ({
      ...item,
      code: generateSlug(item.name), // Add the slug field
    }));

    res.status(200).json({
      success: true,
      data: updatedDataList,
    });
  }
);

export async function scrapeGoldPrices() {
  // Launch the browser and open a new page
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }); // Set headless: false if you want to see the browser
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto("https://bigpara.hurriyet.com.tr/altin/ata-altin-fiyati/");

  // Wait for the page to load and the required elements to appear
  await page.waitForSelector(".tBody");

  // Scrape the gold prices
  const prices = await page.$$eval(".tBody ul", (uls) => {
    return uls.map((ul: any) => {
      const name =
        ul.querySelector(".cell010 a")?.textContent.trim() ||
        ul.querySelector(".cell010 b")?.textContent.trim(); // Extract name
      const alis = ul.querySelectorAll(".cell009")[0]?.textContent.trim(); // Extract alış price
      const satis = ul.querySelectorAll(".cell009")[1]?.textContent.trim(); // Extract satış price
      return { name, alis, satis, price: satis };
    });
  });

  // Close the browser
  await browser.close();

  // Add slug to each item in the list
  const updatedPrices = prices.map((item) => ({
    ...item,
    code: generateSlug(item.name), // Add the slug field
  }));

  return updatedPrices;
}
