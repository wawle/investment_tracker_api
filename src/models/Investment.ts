import mongoose, { Document, Schema } from "mongoose";
import { IAccount } from "./Account";
import Transaction from "./Transaction";
import { IAsset, IPrice } from "./Asset";
import { Currency } from "../utils/enums";

export interface IInvestment extends Document {
  _id: string;
  asset: IAsset;
  account: IAccount;
  avg_price: IPrice;
  amount: number;
}

const InvestmentSchema: Schema<IInvestment> = new Schema(
  {
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Asset",
      required: true,
    },
    account: {
      type: mongoose.Schema.ObjectId,
      ref: "Account",
      required: true,
    },
    avg_price: {
      type: Object,
      required: true,
      default: {
        [Currency.TRY]: 0,
        [Currency.EUR]: 0,
        [Currency.USD]: 0,
      },
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Cascade delete Investments when a Investment is deleted
InvestmentSchema.pre("findOneAndDelete", async function (next) {
  const investmentId = (this as any)._conditions._id;

  // Access the document via 'this' when the middleware is set to { document: true, query: false }
  console.log(
    `Investment ${investmentId} is being deleted. Deleting related transactions.`
  );

  // Cascade delete Investments related to this Investment
  await Transaction.deleteMany({ investment: investmentId });

  next(); // Proceed with the delete operation
});

// Reverse populate with virtuals
InvestmentSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "investment",
  justOne: false,
});

// Mongoose modelini dışa aktarıyoruz
const Investment = mongoose.model<IInvestment>("Investment", InvestmentSchema);

export default Investment;
