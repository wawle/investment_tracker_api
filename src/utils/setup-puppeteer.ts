import { execSync } from "child_process";

/**
 * Puppeteer kurulumunu gerçekleştiren yardımcı fonksiyon
 */
export const setupPuppeteer = () => {
  try {
    console.log("Puppeteer tarayıcı kurulumu başlatılıyor...");

    // Chrome tarayıcısını kur
    execSync("npx puppeteer browsers install chrome", { stdio: "inherit" });

    console.log("Puppeteer tarayıcı kurulumu başarıyla tamamlandı.");
  } catch (error) {
    console.error("Puppeteer tarayıcı kurulumu sırasında hata oluştu:", error);
    throw error;
  }
};
