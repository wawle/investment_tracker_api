import mongoose, { Document, Schema } from "mongoose";
import { AssetMarket, Currency } from "../utils/enums";
import History from "./History";

export interface IAsset extends Document {
  ticker: string;
  market: AssetMarket;
  price: number;
  icon?: string;
  name: string;
  currency: Currency;
  scrapedAt: Date;
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
      type: Number,
      default: 0,
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

// Cascade delete Historys when a History is deleted
AssetSchema.pre("findOneAndDelete", async function (next) {
  const assetId = (this as any)._conditions._id;

  // Access the document via 'this' when the middleware is set to { document: true, query: false }
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

// Mongoose modelini dışa aktarıyoruz
const Asset = mongoose.model<IAsset>("Asset", AssetSchema);

export default Asset;
