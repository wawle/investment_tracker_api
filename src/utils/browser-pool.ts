import puppeteer, { Browser } from "puppeteer";

class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<Browser> | null = null;
  private lastUsed: number = Date.now();
  private maxIdleTime: number = 5 * 60 * 1000; // 5 dakika
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Belirli aralıklarla kullanılmayan tarayıcıyı kapatmak için kontrol
    this.checkInterval = setInterval(() => {
      this.checkAndCleanupBrowser();
    }, 60 * 1000); // Her dakika kontrol et
  }

  public static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  private async checkAndCleanupBrowser(): Promise<void> {
    if (this.browser && Date.now() - this.lastUsed > this.maxIdleTime) {
      console.log("Browser uzun süredir kullanılmıyor, kapatılıyor...");
      await this.closeBrowser();
    }
  }

  public async getBrowser(): Promise<Browser> {
    this.lastUsed = Date.now();

    // Eğer tarayıcı zaten başlatılıyorsa, mevcut promise'i döndür
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Eğer tarayıcı varsa ve açıksa, onu döndür
    if (this.browser) {
      try {
        // Tarayıcının hala açık olup olmadığını kontrol et
        const pages = await this.browser.pages();
        return this.browser;
      } catch (error) {
        console.log("Mevcut tarayıcı kapanmış, yeniden başlatılıyor...");
        this.browser = null;
      }
    }

    // Yeni bir tarayıcı başlat
    this.isInitializing = true;
    this.initPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Shared memory kullanımını devre dışı bırak
        "--disable-accelerated-2d-canvas", // Hızlandırılmış 2D canvas'ı devre dışı bırak
        "--disable-gpu", // GPU kullanımını devre dışı bırak
        "--js-flags=--max-old-space-size=512", // JavaScript heap boyutunu sınırla
        "--disable-web-security", // Web security'i devre dışı bırak
        "--disable-features=VizDisplayCompositor", // Compositor'ı devre dışı bırak
        "--disable-extensions", // Extension'ları devre dışı bırak
        "--disable-plugins", // Plugin'leri devre dışı bırak
        "--disable-images", // Resimleri devre dışı bırak
        "--disable-javascript", // JavaScript'i devre dışı bırak (gerekirse)
        "--disable-css", // CSS'i devre dışı bırak (gerekirse)
      ],
      timeout: 120000, // 2 dakika timeout
    });

    try {
      this.browser = await this.initPromise;
      this.isInitializing = false;
      return this.browser;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log("Browser başarıyla kapatıldı");
      } catch (error) {
        console.error("Browser kapatılırken hata oluştu:", error);
      } finally {
        this.browser = null;
      }
    }
  }

  public async cleanup(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    await this.closeBrowser();
  }
}

export default BrowserPool;
