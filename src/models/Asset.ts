import mongoose, { Document, Model, Schema } from "mongoose";
import { AssetMarket, Currency } from "../utils/enums";
import History from "./History";
import { CurrencyRates, getCurrencyRates } from "../utils/currency-converter";
import {
  getAssetPrices,
  getCurrencyAssets,
  getExchangeRates,
} from "../utils/price-setter";

// Define a type for the price object
export interface IPrice {
  [Currency.TRY]: number;
  [Currency.EUR]: number;
  [Currency.USD]: number;
}

export interface IAsset extends Document {
  _id: string;
  ticker: string;
  market: AssetMarket;
  price: IPrice;
  icon?: string;
  name: string;
  currency: Currency;
  scrapedAt: Date;
  // Add setPrice method
  setPrice: (currency: Currency, price: number, rates: CurrencyRates) => void;
}

// Create a new interface that extends Mongoose's Model type
interface IAssetModel extends Model<IAsset> {
  updatePricesForAllAssets(usdRate: number, eurRate: number): Promise<IAsset[]>;
}

const AssetSchema: Schema<IAsset> = new Schema(
  {
    ticker: {
      type: String,
      required: [true, "Please add a ticker"],
    },
    icon: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    currency: {
      type: String,
      enum: [Currency.EUR, Currency.TRY, Currency.USD],
      default: Currency.TRY,
    },
    price: {
      type: Object,
      required: true,
      default: {
        [Currency.TRY]: 0,
        [Currency.EUR]: 0,
        [Currency.USD]: 0,
      },
    },
    scrapedAt: {
      type: Date,
      default: Date.now(),
    },
    market: {
      type: String,
      enum: [
        AssetMarket.Commodity,
        AssetMarket.Crypto,
        AssetMarket.Exchange,
        AssetMarket.Fund,
        AssetMarket.TRStock,
        AssetMarket.USAStock,
      ],
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

AssetSchema.statics.updatePricesForAllAssets = async function (
  usdRate: number,
  eurRate: number
) {
  const allAssets = await Asset.find(); // `this` refers to the model here
  const rates = getCurrencyRates(usdRate, eurRate);

  allAssets.forEach((asset) => {
    asset.setPrice(asset.currency, asset.price[asset.currency], rates);
  });

  // Save all updated assets
  await Promise.all(allAssets.map((asset) => asset.save()));

  return allAssets;
};

// Custom setter for the price field to handle conversion logic
AssetSchema.methods.setPrice = function (
  currency: Currency,
  price: number,
  rates: CurrencyRates
) {
  const convertedPrice = getAssetPrices(currency, price, rates);

  // Update the price object with the calculated values
  this.price = convertedPrice;
};

// Cascade delete Historys when a History is deleted
AssetSchema.pre("save", async function (next) {
  const { usdRate, eurRate } = await getExchangeRates();
  const rates = getCurrencyRates(usdRate, eurRate);
  this.setPrice(this.currency, this.price as any, rates);

  next(); // Proceed with the delete operation
});

// Cascade delete Historys when a History is deleted
AssetSchema.pre("findOneAndDelete", async function (next) {
  const assetId = (this as any)._conditions._id;

  console.log(`Asset ${assetId} is being deleted. Deleting related histories.`);

  // Cascade delete Historys related to this History
  await History.deleteMany({ asset: assetId });

  next(); // Proceed with the delete operation
});

// Reverse populate with virtuals
AssetSchema.virtual("histories", {
  ref: "History",
  localField: "_id",
  foreignField: "asset",
  justOne: false,
});

// Create and export the model with the augmented static type
const Asset = mongoose.model<IAsset, IAssetModel>("Asset", AssetSchema);

export default Asset;
