import puppeteer from "puppeteer";

interface FundData {
  name: string;
  ticker: string;
  price: string;
  fundPrice?: number;
  change?: string;
  currency: string;
}

export async function fetchFunds(): Promise<FundData[]> {
  // Fetch data from multiple sources using Promise.all
  const [
    akbank,
    isbank,
    yapikredi,
    anadoluemeklilik,
    aet,
    bgl,
    bloomberg,
  ]: FundData[][] = await Promise.all([
    fetchBloombergFunds(),
    fetchAkBankFunds(),
    fetchIsBankFunds(),
    fetchYapiKrediBankFunds(),
    fetchBesFunds(),
    fetchFundByTicker("https://www.yatirimdirekt.com/bes/bes_fon_bulteni/AET"),
    fetchFundByTicker("https://www.yatirimdirekt.com/bes/bes_fon_bulteni/BGL"),
  ]);

  const updatedFunds: FundData[] = [
    ...bloomberg,
    ...akbank,
    ...isbank,
    ...yapikredi,
    ...anadoluemeklilik,
    ...aet,
    ...bgl,
  ].reduce<FundData[]>((acc, item) => {
    if (item.name && item.ticker && item.price) {
      const price = parseFloat(item.price.replace(",", "."));
      if (!isNaN(price)) {
        acc.push({
          ...item,
          price: price.toString(),
          currency: "try",
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
    protocolTimeout: 3600000,
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
      return { name, ticker, price, currency: "try" };
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
    protocolTimeout: 3600000,
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
      return { name, ticker, price, currency: "try" };
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
    protocolTimeout: 3600000,
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
      return { ticker, name, price, currency: "try" };
    });
  });

  // Close the browser
  await browser.close();

  // Return the extracted fund data
  return fundData;
}

async function fetchZiraatFunds(): Promise<FundData[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 3600000,
  });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar", {
      timeout: 0,
      waitUntil: "domcontentloaded",
    });

    // Open the "Yatırım Fonları Fiyatları" accordion
    await page.waitForSelector("#accordion6", { timeout: 30000 });
    await page.click("#accordion6");
    await page.waitForSelector("#content-6", { visible: true, timeout: 30000 });

    // Prepare dates: start = first day of current month, end = today in dd.mm.yyyy
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = formatDate(startOfMonth);
    const endStr = formatDate(now);

    // Fill the date inputs inside the accordion content
    await page.waitForSelector("#content-6 #datePickerStart", {
      timeout: 30000,
    });
    await page.waitForSelector("#content-6 #datePickerEnd", { timeout: 30000 });

    await page.$eval(
      "#content-6 #datePickerStart",
      (el, value) => {
        const input = el as HTMLInputElement;
        input.value = value as string;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      startStr
    );

    await page.$eval(
      "#content-6 #datePickerEnd",
      (el, value) => {
        const input = el as HTMLInputElement;
        input.value = value as string;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      endStr
    );

    // Click the "Listele" button within the same content container
    await page.evaluate(() => {
      const container = document.querySelector(
        "#content-6"
      ) as HTMLElement | null;
      if (!container) return;
      const candidates = Array.from(
        container.querySelectorAll("a.btn.btn-red, button.btn.btn-red")
      ) as HTMLElement[];
      const target = candidates.find((el) =>
        (el.textContent || "").toLowerCase().includes("listele")
      );
      target?.click();
    });

    // Wait for the results table rows to appear
    await page.waitForFunction(
      () => {
        const container = document.querySelector("#content-6");
        const rows = container?.querySelectorAll("tbody tr");
        return !!rows && rows.length > 0;
      },
      { timeout: 60000 }
    );

    // Extract name (first td) and price (second td). Default ticker = name.
    const fundData: FundData[] = await page.evaluate(() => {
      const container = document.querySelector("#content-6")!;
      const rows = Array.from(container.querySelectorAll("tbody tr"));
      return rows
        .map((row) => {
          const cells = row.querySelectorAll("td");
          const name = (cells[0]?.textContent || "").trim();
          const price = (cells[1]?.textContent || "").trim();
          return { name, ticker: name, price, currency: "try" };
        })
        .filter((x) => x.name && x.price);
    });

    return fundData;
  } finally {
    await browser.close();
  }
}

async function fetchBloombergFunds(): Promise<FundData[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 3600000,
  });
  const page = await browser.newPage();

  try {
    await page.goto(
      "https://www.bloomberght.com/yatirim-fonlari/fon-karsilastirma",
      {
        timeout: 0,
        waitUntil: "domcontentloaded",
      }
    );

    // Wait for the comparison table rows
    await page.waitForSelector('table[data-type="table-type1"] tbody tr', {
      timeout: 60000,
    });

    const rows: FundData[] = await page.evaluate(() => {
      const rowNodes = Array.from(
        document.querySelectorAll<HTMLTableRowElement>(
          'table[data-type="table-type1"] tbody tr'
        )
      );

      const getCellText = (row: HTMLTableRowElement, index: number): string => {
        const cell = row.querySelector<HTMLTableCellElement>(
          `td:nth-of-type(${index})`
        );
        if (!cell) return "";
        const anchor = cell.querySelector("a");
        const text = (anchor?.textContent || cell.textContent || "").trim();
        return text.replace(/\s+/g, " ");
      };

      return rowNodes
        .map((row) => {
          const ticker = getCellText(row, 1);
          const name = getCellText(row, 2);
          const price = getCellText(row, 3);
          const change = getCellText(row, 4);
          return { ticker, name, price, change, currency: "try" };
        })
        .filter((x) => x.ticker && x.name && x.price);
    });

    return rows;
  } finally {
    await browser.close();
  }
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
    protocolTimeout: 3600000,
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
      return { ticker: "", name: "", price: "0", currency: "try" };
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
    return { name, ticker, price, currency: "try" };
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
    protocolTimeout: 3600000,
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
        currency: "try",
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
