import mongoose, { Document, Model, Schema } from "mongoose";
import { AssetMarket, Currency } from "../utils/enums";
import History from "./History";
import { CurrencyRates, getCurrencyRates } from "../utils/currency-converter";
import { getAssetPrices, getRateValues } from "../utils/rate-handler";

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
AssetSchema.post("save", async function () {
  const { usdRate, eurRate } = await getRateValues();
  const rates = getCurrencyRates(usdRate, eurRate);
  this.setPrice(this.currency, this.price as any, rates);
});

AssetSchema.pre("findOneAndUpdate", async function (next) {
  // Extract the updated fields from this object to check if 'price' is being updated.
  const update = this.getUpdate() as IAsset;
  if (update && update.price) {
    // Assuming `update.price` is the price to be converted and you want to handle currency conversion before update.
    const newPrice = update.price as any;
    const currency = update.currency;
    const { usdRate, eurRate } = await getRateValues();
    const rates = getCurrencyRates(usdRate, eurRate); // Fetch the latest currency rates.
    // Convert the price
    const convertedPrice = getAssetPrices(currency, newPrice, rates);
    // Update the price in the update object directly
    update.price = convertedPrice;
  }

  next(); // Proceed with the update operation
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
