import path from "path";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cors from "cors";
import errorHandler from "./middleware/error";
import connectDB from "./config/db";
import { setupPuppeteer } from "./utils/setup-puppeteer";

// Load env vars
const envPath = path.join(__dirname, "config", "config.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("Error loading .env file:", result.error);
  process.exit(1);
}

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "JWT_EXPIRE", "MONGO_URI"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

// Connect to database
connectDB();

// Setup Puppeteer
try {
  setupPuppeteer();
} catch (error) {
  console.warn(
    "Puppeteer kurulumu sırasında hata oluştu, devam ediliyor:",
    error
  );
}

// job files
import { startDailyJob, startScheduler } from "./utils/scheduler";

// Route files
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import accountsRouter from "./routes/accounts";
import assetsRouter from "./routes/assets";
import transactionsRouter from "./routes/transactions";
import exchangeRouter from "./routes/exchange";
import investmentsRouter from "./routes/investments";
import fundsRouter from "./routes/funds";
import stocksRouter from "./routes/stocks";
import indiciesRouter from "./routes/indicies";
import commoditiesRouter from "./routes/commodities";
import scrapingRouter from "./routes/scraping";
import historiesRouter from "./routes/histories";
import smsRouter from "./routes/sms";

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
});
app.use(limiter);

// Prevent HTTP parameter pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Mount routers
// for current user actions
app.use("/api/v1/auth", authRouter);
// for admin actions
app.use("/api/v1/users", usersRouter);
// user accounts
app.use("/api/v1/accounts", accountsRouter);
// user assets
app.use("/api/v1/assets", assetsRouter);
// asset transactions
app.use("/api/v1/transactions", transactionsRouter);
// döviz kurları için
app.use("/api/v1/exchange", exchangeRouter);
// fonlar için
app.use("/api/v1/funds", fundsRouter);
// hisse senetleri için
app.use("/api/v1/stocks", stocksRouter);
// indicies
app.use("/api/v1/indicies", indiciesRouter);
// altın ve gümüş için
app.use("/api/v1/commodities", commoditiesRouter);
// investments
app.use("/api/v1/investments", investmentsRouter);
// scraping
app.use("/api/v1/scraping", scrapingRouter);
// histories
app.use("/api/v1/histories", historiesRouter);
// sms
app.use("/api/v1/sms", smsRouter);

// jobs
startScheduler();
startDailyJob();

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
