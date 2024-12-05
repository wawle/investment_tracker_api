import mongoose, { Document, Schema } from "mongoose";
import { IAccount } from "./Account";
import Transaction from "./Transaction";
import { AssetType, Currency } from "../utils/enums";

export interface IAsset extends Document {
  symbol: string;
  account: IAccount;
  currency: Currency;
  avg_price: number;
  amount: number;
  type: AssetType;
}

const AssetSchema: Schema<IAsset> = new Schema(
  {
    symbol: {
      type: String,
      required: [true, "Please add a symbol"],
    },
    account: {
      type: mongoose.Schema.ObjectId,
      ref: "Account",
      required: true,
    },
    currency: {
      type: String,
      enum: [Currency.EUR, Currency.TRY, Currency.USD],
      default: Currency.TRY,
    },
    avg_price: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: [
        AssetType.Commodity,
        AssetType.Crypto,
        AssetType.Exchange,
        AssetType.Fund,
        AssetType.Stock,
      ],
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Cascade delete Assets when a Asset is deleted
AssetSchema.pre("findOneAndDelete", async function (next) {
  const assetId = (this as any)._conditions._id;

  // Access the document via 'this' when the middleware is set to { document: true, query: false }
  console.log(
    `Asset ${assetId} is being deleted. Deleting related transactions.`
  );

  // Cascade delete Assets related to this Asset
  await Transaction.deleteMany({ asset: assetId });

  next(); // Proceed with the delete operation
});

// Reverse populate with virtuals
AssetSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "asset",
  justOne: false,
});

// Mongoose modelini dışa aktarıyoruz
const Asset = mongoose.model<IAsset>("Asset", AssetSchema);

export default Asset;
