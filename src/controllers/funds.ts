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
            fund.name.toLowerCase().includes(search.toLowerCase()) ||
            fund.ticker.toLowerCase().includes(search.toLowerCase())
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
  name: string;
  ticker: string;
  price: string;
  fundPrice?: number;
}

export async function fetchFunds(): Promise<FundData[]> {
  // Fetch data from multiple sources using Promise.all
  const [isbank, yapikredi, anadoluemeklilik, ydi, aet, bgl]: FundData[][] =
    await Promise.all([
      // fetchAkBankFunds(),
      fetchIsBankFunds(),
      fetchYapiKrediBankFunds(),
      fetchBesFunds(),
      fetchFundByTicker("https://www.yatirimdirekt.com/fon/fon_bulteni/YDI"),
      fetchFundByTicker(
        "https://www.yatirimdirekt.com/bes/bes_fon_bulteni/AET"
      ),
      fetchFundByTicker(
        "https://www.yatirimdirekt.com/bes/bes_fon_bulteni/BGL"
      ),
    ]);

  const updatedFunds: FundData[] = [
    ...isbank,
    ...yapikredi,
    ...anadoluemeklilik,
    ...ydi,
    ...aet,
    ...bgl,
  ].reduce<FundData[]>((acc, item) => {
    if (item.name && item.ticker && item.price) {
      const fundPrice = parseFloat(item.price.replace(",", "."));
      if (!isNaN(fundPrice)) {
        acc.push({
          ...item,
          fundPrice,
        });
      }
    }
    return acc;
  }, []);

  return updatedFunds;
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
    timeout: 0,
  });

  // Wait for the table rows to load
  await page.waitForSelector("tbody");

  // Extract data from the table
  // Extract data from the table
  const fundData: FundData[] = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    return rows.map((row) => {
      const name =
        row.querySelector("td a.fund-name")?.textContent?.trim() ?? "";
      const ticker =
        row.querySelector("td .table-code")?.textContent?.trim() ?? "";

      // Extract the unit share price from the third <td> element (second column)
      const unitSharePriceElement = row.querySelector(
        "td[data-value]:nth-of-type(3)"
      );
      let price = unitSharePriceElement?.textContent?.trim() ?? "";

      // Clean up unwanted extra characters like commas, newlines, and excessive whitespaces
      price = price.replace(/[\n\r\t]+/g, "").trim();

      // Return the cleaned-up data
      return { name, ticker, price };
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
      timeout: 0,
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
      const ticker =
        row.querySelector("td a")?.textContent?.split(" /")[0]?.trim() ?? "";

      // Extract fund name from the second <td> link
      const name =
        row.querySelector("td:nth-of-type(2) a")?.textContent?.trim() ?? "";

      // Extract unit share price from the third <td> element
      const price =
        row
          .querySelector("td:nth-of-type(3)")
          ?.textContent?.trim()
          .split("\n")[0] ?? "";

      // Return the cleaned-up data
      return { name, ticker, price };
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
      timeout: 0,
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
      const ticker =
        row.querySelector("div.box-col.box-col-label a")?.textContent?.trim() ??
        "";

      // Extract fund name from column 2 (the <a> tag inside box-col-main)
      const name =
        row.querySelector("div.box-col.box-col-main a")?.textContent?.trim() ??
        "";

      // Extract unit share price from column 4 (the first <li> in box-col-data)
      const price =
        row
          .querySelector("div.box-col.box-col-data ul li:first-child")
          ?.textContent?.trim() ?? "";

      // Return the cleaned-up data
      return { ticker, name, price };
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
    timeout: 0,
    waitUntil: "domcontentloaded",
  });

  // Extract the fund code and fund name

  const fundData = await page.evaluate(() => {
    // Get the text content from the <h1> tag
    const h1Text = document.querySelector("h1")?.textContent?.trim();

    if (!h1Text) {
      return { ticker: "", name: "", price: "0" };
    }

    // Split the text to get the fund code and fund name
    const [ticker, ...nameArray] = h1Text.split(" - ");

    // Join the fund name back together if there are multiple words after the dash
    const name = nameArray.join(" ");

    // Select the price inside the <p> tag in the <li> with class "bg-white"
    const priceElement = document.querySelector(
      "li.bg-white p.fs-18.fw-600.color-1.mb-0"
    );
    const price = priceElement?.textContent?.trim() || "0";

    // Return the fund data object
    return { name, ticker, price };
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchFundByTicker(url: string): Promise<FundData[]> {
  // Launch Puppeteer browser instance
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    // Navigate to the website
    await page.goto(url, {
      timeout: 0,
      waitUntil: "domcontentloaded",
    });

    // Extract ticker, name, and price
    const data = await page.evaluate(() => {
      // Select the main heading for the fund
      const nameElement = document.querySelector("h2.osmanliTextColor");
      const nameText = nameElement?.textContent?.trim() || "";

      // Split the text into ticker and name
      const [ticker = "", name = ""] = nameText
        .split(" - ")
        .map((s) => s.trim());

      // Extract price from the specific span
      const priceElement = document.querySelector(".change-value-span-2");
      const priceText = priceElement?.textContent?.trim() || "";
      const [price = ""] = priceText.split(" ");

      return {
        name: nameText.substring(0, 50), // Truncate if necessary
        ticker,
        price,
      };
    });

    return [data];
  } catch (error) {
    console.error("Error fetching fund data:", error);
    return [];
  } finally {
    // Ensure the browser is closed
    await browser.close();
  }
}
