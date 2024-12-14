import puppeteer from "puppeteer";
import asyncHandler from "../middleware/async";
import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/errorResponse";

// @desc      Get all funds
// @route     GET /api/v1/funds
// @access    Public
export const getFunds = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get the search query param (optional)
    const search = req.query.search ? req.query.search.toString() : "";

    const data = await fetchFunds();

    // If a search term is provided, filter the data by fund name or code
    const filteredData = search
      ? data.filter(
          (fund) =>
            fund.fundName.toLowerCase().includes(search.toLowerCase()) ||
            fund.fundCode.toLowerCase().includes(search.toLowerCase())
        )
      : data;

    // Send back the final response
    res.status(200).json({
      success: true,
      data: filteredData, // Send the filtered data here
    });
  }
);

// @desc      Get single fund
// @route     GET /api/v1/funds/:ticker
// @access    Public
export const getFundByTicker = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const fund = await fetchFundByTicker(req.params.ticker);
    if (!fund) {
      return next(
        new ErrorResponse(
          `fund not found with ticker of ${req.params.ticker}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: fund,
    });
  }
);

interface FundData {
  fundName: string;
  fundCode: string;
  price: string;
}

export async function fetchFunds(): Promise<FundData[]> {
  // Fetch data from multiple sources using Promise.all
  const [isbank, yapikredi, anadoluemeklilik, ydi]: FundData[][] =
    await Promise.all([
      // fetchAkBankFunds(),
      fetchIsBankFunds(),
      fetchYapiKrediBankFunds(),
      fetchBesFunds(),
      fetchFundByTicker("YDI"),
    ]);

  // Flatten the array of arrays into a single array of FundData
  const data: FundData[] = [
    ...isbank,
    ...yapikredi,
    ...anadoluemeklilik,
    ...ydi,
  ].filter((item) => item.fundName && item.fundCode && item.price);

  return data;
}

async function fetchIsBankFunds(): Promise<FundData[]> {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto("https://www.isportfoy.com.tr/getiri-ve-fiyatlar", {
    waitUntil: "domcontentloaded",
  });

  // Wait for the table rows to load
  await page.waitForSelector("tbody");

  // Extract data from the table
  // Extract data from the table
  const fundData: FundData[] = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    return rows.map((row) => {
      const fundName =
        row.querySelector("td a.fund-name")?.textContent?.trim() ?? "";
      const fundCode =
        row.querySelector("td .table-code")?.textContent?.trim() ?? "";

      // Extract the unit share price from the third <td> element (second column)
      const unitSharePriceElement = row.querySelector(
        "td[data-value]:nth-of-type(3)"
      );
      let price = unitSharePriceElement?.textContent?.trim() ?? "";

      // Clean up unwanted extra characters like commas, newlines, and excessive whitespaces
      price = price.replace(/[\n\r\t]+/g, "").trim();

      // Return the cleaned-up data
      return { fundName, fundCode, price };
    });
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchYapiKrediBankFunds(): Promise<FundData[]> {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto(
    "https://www.yapikredi.com.tr/yatirimci-kosesi/fon-bilgileri",
    {
      waitUntil: "domcontentloaded",
    }
  );

  // Wait for the table rows to load
  await page.waitForSelector("tbody");

  // Extract data from the table
  const fundData: FundData[] = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    return rows.map((row) => {
      // Extract fund code from the first <td> link (the part before the "/")
      const fundCode =
        row.querySelector("td a")?.textContent?.split(" /")[0]?.trim() ?? "";

      // Extract fund name from the second <td> link
      const fundName =
        row.querySelector("td:nth-of-type(2) a")?.textContent?.trim() ?? "";

      // Extract unit share price from the third <td> element
      const price =
        row
          .querySelector("td:nth-of-type(3)")
          ?.textContent?.trim()
          .split("\n")[0] ?? "";

      // Return the cleaned-up data
      return { fundCode, fundName, price };
    });
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchAkBankFunds(): Promise<FundData[]> {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navigate to the URL
  await page.goto(
    "https://www.akportfoy.com.tr/tr/fon/yatirim-fonlari/getiri",
    {
      waitUntil: "domcontentloaded",
    }
  );

  // Wait for the necessary elements to load
  await page.waitForSelector(".box-row");

  // Extract fund data
  const fundData: FundData[] = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".box-row"));
    return rows.map((row) => {
      // Extract fund code from column 0 (the <a> tag inside box-col-label)
      const fundCode =
        row.querySelector("div.box-col.box-col-label a")?.textContent?.trim() ??
        "";

      // Extract fund name from column 2 (the <a> tag inside box-col-main)
      const fundName =
        row.querySelector("div.box-col.box-col-main a")?.textContent?.trim() ??
        "";

      // Extract unit share price from column 4 (the first <li> in box-col-data)
      const price =
        row
          .querySelector("div.box-col.box-col-data ul li:first-child")
          ?.textContent?.trim() ?? "";

      // Return the cleaned-up data
      return { fundCode, fundName, price };
    });
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchBesFunds(): Promise<FundData[]> {
  // Launch the browser
  const beslist = ["AJA", "AEA"];

  const fundData: FundData[] = await Promise.all(
    beslist.map((code) => getFundInfo(code))
  );

  // Return the extracted fund data
  return fundData;
}

async function getFundInfo(code: string): Promise<FundData> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(`https://www.besfongetirileri.com/fon-karti/${code}`, {
    waitUntil: "domcontentloaded",
  });

  // Extract the fund code and fund name

  const fundData = await page.evaluate(() => {
    // Get the text content from the <h1> tag
    const h1Text = document.querySelector("h1")?.textContent?.trim();

    if (!h1Text) {
      return { fundCode: "", fundName: "", price: "0" };
    }

    // Split the text to get the fund code and fund name
    const [fundCode, ...fundNameArray] = h1Text.split(" - ");

    // Join the fund name back together if there are multiple words after the dash
    const fundName = fundNameArray.join(" ");

    // Select the price inside the <p> tag in the <li> with class "bg-white"
    const priceElement = document.querySelector(
      "li.bg-white p.fs-18.fw-600.color-1.mb-0"
    );
    const price = priceElement?.textContent?.trim() || "0";

    // Return the fund data object
    return { fundName, fundCode, price };
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchFundByTicker(ticker: string): Promise<FundData[]> {
  // Launch Puppeteer browser instance
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navigate to the website
  await page.goto(`https://www.yatirimdirekt.com/fon/fon_bulteni/${ticker}`);

  // Extract ticker and name using CSS selectors
  const data = await page.evaluate(() => {
    // Get the name of the fund (long name)
    const nameList = document
      .querySelector("h2.osmanliTextColor")
      ?.textContent?.trim()
      .split(" - ");

    // Get the price from the span with class 'change-value-span-2'
    const priceList = document
      .querySelector(".change-value-span-2 strong")
      ?.textContent?.trim()
      .split(" ");

    return {
      fundName: (nameList?.[1] || "")?.substring(0, 50),
      fundCode: nameList?.[0] || "",
      price: priceList?.[0]?.replace(".", ",") || "",
    };
  });

  // Close the browser instance after scraping
  await browser.close();

  // Send the scraped data as a JSON response
  return [data];
}
