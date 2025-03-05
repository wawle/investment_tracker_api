import mongoose, { Document, Model, Schema } from "mongoose";
import { AssetMarket, Currency } from "../utils/enums";
import History from "./History";
import { getConvertedPrice } from "../utils/rate-handler";

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
  price: {
    try: number;
    usd: number;
    eur: number;
  };
  icon?: string;
  name: string;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
  setPrice: (currency: Currency, price: number) => void;
}

const AssetSchema: Schema<IAsset> = new Schema(
  {
    ticker: {
      type: String,
      required: [true, "Lütfen ticker giriniz"],
      unique: false,
    },
    icon: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Lütfen isim giriniz"],
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      required: [true, "Lütfen currency giriniz"],
    },
    price: {
      try: {
        type: Number,
        required: true,
      },
      usd: {
        type: Number,
        required: true,
      },
      eur: {
        type: Number,
        required: true,
      },
    },
    market: {
      type: String,
      enum: Object.values(AssetMarket),
      required: [true, "Lütfen market giriniz"],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Custom setter for the price field to handle conversion logic
AssetSchema.methods.setPrice = async function (
  currency: Currency,
  price: number
) {
  // Update the price object with the calculated values
  this.price = await getConvertedPrice(currency, price);
};

// Cascade delete Historys when a History is deleted
AssetSchema.post("save", async function () {
  this.setPrice(this.currency, this.price as any);
});

AssetSchema.pre("findOneAndUpdate", async function (next) {
  // Extract the updated fields from this object to check if 'price' is being updated.
  const update = this.getUpdate() as IAsset;
  if (update && update.price) {
    // Assuming `update.price` is the price to be converted and you want to handle currency conversion before update.
    const newPrice = update.price as any;
    const currency = update.currency;

    const convertedPrice = await getConvertedPrice(currency, newPrice);

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
const Asset = mongoose.model<IAsset>("Asset", AssetSchema);

export default Asset;
