import puppeteer, { Browser, Page } from "puppeteer";

export type ScreenerRow = {
  ticker: string;
  name: string;
  icon: string | null;
  price: number | null;
  change: number | null;
  sector: string | null;
  currency: string | null;
  signal: string | null;
};

async function configurePage(page: Page): Promise<void> {
  try {
    await page.setRequestInterception(false);
  } catch {}
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
}

async function selectTurkeyMarket(page: Page): Promise<void> {
  console.log("Starting Turkey market selection process...");

  // Step 1: Click on the market dropdown
  console.log("Step 1: Clicking market dropdown...");
  await page.waitForSelector(".activeAreaContent-jv30Rhzy", { timeout: 30000 });
  await page.click(".activeAreaContent-jv30Rhzy");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 2: Wait for the market selection popover to appear and click "More markets..."
  console.log("Step 2: Looking for 'More markets...' option...");
  await page.waitForSelector(".main-KgzMMF6Z.mainContent-KgzMMF6Z", {
    timeout: 10000,
  });

  // Find and click the "More markets..." button
  const moreMarketsButton = await page.evaluateHandle(() => {
    const buttons = Array.from(
      document.querySelectorAll('div[data-is-popover-item-button="true"]')
    );
    return buttons.find((button) => {
      const titleEl = button.querySelector(".title-LSK1huUA");
      return titleEl && titleEl.textContent?.includes("More markets");
    });
  });

  if (moreMarketsButton && moreMarketsButton.asElement()) {
    await (moreMarketsButton.asElement() as any).click();
  } else {
    throw new Error("Could not find 'More markets...' button");
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 3: Wait for the market selection dialog and click Turkey
  console.log("Step 3: Selecting Turkey market...");
  await page.waitForSelector('[data-dialog-name="Select markets"]', {
    timeout: 15000,
  });

  // Find and click Turkey option
  const turkeyOption = await page.evaluateHandle(() => {
    const containers = Array.from(
      document.querySelectorAll(".container-XLXs8O7w")
    );
    return containers.find((container) => {
      const titleEl = container.querySelector(".title-XLXs8O7w");
      return titleEl && titleEl.textContent?.includes("Turkey");
    });
  });

  if (turkeyOption && turkeyOption.asElement()) {
    await (turkeyOption.asElement() as any).click();
  } else {
    throw new Error("Could not find Turkey market option");
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Click Apply button
  console.log("Step 4: Clicking Apply button...");
  await page.waitForSelector('button[data-overflow-tooltip-text="Apply"]', {
    timeout: 10000,
  });
  await page.click('button[data-overflow-tooltip-text="Apply"]');

  // Wait for the page to load with Turkey market data
  console.log("Waiting for Turkey market data to load...");
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function waitForTable(page: Page): Promise<void> {
  // Wait until table body rows are available
  await page.waitForSelector("tbody tr[data-rowkey]", { timeout: 120000 });
}

async function scrollContainerOnce(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const byOverflow = (el: HTMLElement | null) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      return (
        (overflowY === "auto" || overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight
      );
    };

    const tbody = document.querySelector("tbody");
    let candidate: HTMLElement | null =
      (tbody?.parentElement as HTMLElement) || null;
    for (let i = 0; i < 5 && candidate; i++) {
      if (byOverflow(candidate)) break;
      candidate = candidate.parentElement as HTMLElement | null;
    }

    const container = (candidate ||
      document.scrollingElement) as HTMLElement | null;

    if (container) {
      const before = container.scrollTop;
      const step = Math.max(300, Math.floor(container.clientHeight * 0.9));
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.min(before + step, maxScrollTop);
      const reachedEnd = container.scrollTop >= maxScrollTop - 2;
      return reachedEnd;
    } else {
      const before = window.scrollY;
      const step = Math.max(300, Math.floor(window.innerHeight * 0.9));
      window.scrollTo(0, before + step);
      const reachedEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      return reachedEnd;
    }
  });
}

export async function fetchTradingViewScreener(opts?: {
  sectorIndex?: number;
  signalIndex?: number;
}): Promise<ScreenerRow[]> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  console.log("Starting TradingView Turkey screener fetch...", { opts });

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      timeout: 300000,
      protocolTimeout: 3600000,
    });
    page = await browser.newPage();
    page.setDefaultTimeout(300000);
    page.setDefaultNavigationTimeout(300000);
    await configurePage(page);

    // Navigate to TradingView screener
    await page.goto("https://www.tradingview.com/screener/", {
      waitUntil: "networkidle0",
      timeout: 300000,
    });

    // Select Turkey market
    await selectTurkeyMarket(page);

    // Wait for the table to load
    await waitForTable(page);

    // Identify column indices once
    const { priceIndex, changeIndex } = await page!.evaluate(() => {
      const headers = Array.from(document.querySelectorAll("thead th"));
      const findIndex = (needle: string) =>
        headers.findIndex((th) =>
          (th.getAttribute("data-field") || "").toLowerCase().includes(needle)
        );
      const priceIndex = findIndex("price");
      const changeIndex = findIndex("change");
      return { priceIndex, changeIndex };
    });

    // Collect incrementally while scrolling through virtualized list
    const seen = new Set<string>();
    const collected: ScreenerRow[] = [];

    const extractVisible = async () => {
      const chunk: ScreenerRow[] = await page!.evaluate(
        ({ priceIndex, changeIndex, sectorIndex, signalIndex }) => {
          const getText = (el: Element | null | undefined) =>
            (el?.textContent || "").trim();
          const toNumber = (text: string | null) => {
            if (!text) return null;
            const normalized = text
              .replace(/\u2212/g, "-")
              .replace(/[^0-9+\-.,]/g, "")
              .replace(/,(?=\d{3}(\D|$))/g, "")
              .replace(",", ".");
            const n = parseFloat(normalized);
            return Number.isFinite(n) ? n : null;
          };
          const items: ScreenerRow[] = [] as any;
          const trs = Array.from(
            document.querySelectorAll("tbody tr[data-rowkey], tbody tr")
          );
          for (const tr of trs) {
            const tds = Array.from(tr.querySelectorAll("td"));
            const firstTd = tds[0];
            const iconEl = firstTd?.querySelector(
              'img[class*="tickerLogo-"]'
            ) as HTMLImageElement | null;
            const icon = iconEl?.src || null;
            const ticker = getText(
              firstTd?.querySelector('a[class*="tickerNameBox-"]')
            );
            const name = getText(
              firstTd?.querySelector('sup[class*="tickerDescription-"]')
            );
            const priceCell = priceIndex >= 0 ? tds[priceIndex] : tds[1];
            const priceText = getText(priceCell);
            const price = toNumber(priceText);
            const changeCell = changeIndex >= 0 ? tds[changeIndex] : tds[2];
            const changeText = getText(changeCell);
            const change = toNumber(changeText);
            const sectorCell =
              typeof sectorIndex === "number" && sectorIndex >= 0
                ? tds[sectorIndex]
                : undefined;
            const sector = getText(sectorCell as any) || null;
            const signalCell =
              typeof signalIndex === "number" && signalIndex >= 0
                ? tds[signalIndex]
                : undefined;
            const signal = getText(signalCell as any) || null;
            console.log({ signal, sector, signalIndex, sectorIndex });
            if (ticker)
              items.push({
                ticker,
                name,
                icon,
                price,
                change,
                sector,
                signal,
                currency: "try", // Turkey uses TRY currency
              });
          }
          return items;
        },
        {
          priceIndex,
          changeIndex,
          sectorIndex: opts?.sectorIndex,
          signalIndex: opts?.signalIndex,
        }
      );
      let added = 0;
      for (const row of chunk) {
        if (!seen.has(row.ticker)) {
          seen.add(row.ticker);
          collected.push(row);
          added++;
        }
      }
      return added;
    };

    // Start from top
    await page.evaluate(() => {
      const tbody = document.querySelector("tbody");
      const container = (tbody?.parentElement ||
        document.scrollingElement) as HTMLElement | null;
      if (container instanceof HTMLElement) container.scrollTop = 0;
      else window.scrollTo(0, 0);
    });

    let noNewStreak = 0;
    const MAX_NO_NEW_STREAK = 25;
    const MAX_STEPS = 3000;
    for (let step = 0; step < MAX_STEPS; step++) {
      const added = await extractVisible();
      if (added === 0) noNewStreak++;
      else noNewStreak = 0;
      const reachedEnd = await scrollContainerOnce(page);
      await new Promise((r) => setTimeout(r, 400));

      if (reachedEnd && noNewStreak >= MAX_NO_NEW_STREAK) break;
    }

    console.log(`Collected ${collected.length} Turkey market stocks`);
    return collected;
  } catch (error) {
    console.error("Error fetching TradingView Turkey screener:", error);
    return [];
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {}
    }
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

export default fetchTradingViewScreener;
