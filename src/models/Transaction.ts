import mongoose, { Document, Schema } from "mongoose";
import Investment, { IInvestment } from "./Investment";
import { Currency, TransactionType } from "../utils/enums";
import { IPrice } from "./Asset";
import { getConvertedPrice } from "../utils/rate-handler";

export interface ITransaction extends Document {
  _id: string;
  investment: IInvestment;
  price: IPrice;
  quantity: number;
  type: TransactionType;
  setPrice: (currency: Currency, price: number) => void;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    investment: {
      type: mongoose.Schema.ObjectId,
      ref: "Investment",
      required: true,
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
    quantity: {
      type: Number,
      default: 0,
    },
    type: {
      type: Number,
      enum: [TransactionType.Buy, TransactionType.Sell],
      default: TransactionType.Buy,
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ investment: 1, createdAt: -1 });

const getAverageCost = async function (investmentId: string) {
  try {
    // Fetch investment with asset population
    const investment = await Investment.findById(investmentId).populate(
      "asset"
    );
    const asset = investment?.asset; // Get the associated asset

    // Use Mongoose aggregation to calculate totalAmount and totalQuantity
    const transactions = await Transaction.find({
      investment: investmentId,
    });

    const buyQuantity = transactions.reduce((acc, transaction) => {
      return (
        acc +
        (transaction.type === TransactionType.Buy ? transaction.quantity : 0)
      );
    }, 0);

    const sellQuantity = transactions.reduce((acc, transaction) => {
      return (
        acc +
        (transaction.type === TransactionType.Sell ? transaction.quantity : 0)
      );
    }, 0);

    const totalQuantity = buyQuantity - sellQuantity;

    // Calculate the average cost
    if (totalQuantity > 0) {
      const buyTransactions = transactions.filter(
        (transaction) => transaction.type === TransactionType.Buy
      );

      const totalValue = buyTransactions.reduce((acc, transaction) => {
        // Varsayılan para birimi olarak asset'in para birimini kullanıyoruz
        const price = transaction.price[asset?.currency || Currency.TRY];
        return acc + price * transaction.quantity;
      }, 0);

      const avg_price = totalValue / buyQuantity;

      // Update the investment with the calculated average cost and quantity
      await Investment.findByIdAndUpdate(investmentId, {
        avg_price,
        amount: totalQuantity,
      });

      console.log("Average cost updated:", avg_price);
    }
  } catch (error) {
    console.error("Error calculating average cost:", error);
  }
};

// Custom setter for the price field to handle conversion logic
TransactionSchema.methods.setPrice = async function (
  currency: Currency,
  price: number
) {
  // Update the price object with the calculated values
  this.price = await getConvertedPrice(currency, price);
};

TransactionSchema.pre("save", async function (next) {
  const invesment = await Investment.findById(this.investment)
    .select("asset")
    .populate("asset");
  if (!invesment) return;
  await this.setPrice(invesment?.asset.currency, this.price as any);
});

// Call getAverageCost after save
TransactionSchema.post("save", async function () {
  const invesment = await Investment.findById(this.investment)
    .select("asset")
    .populate("asset");
  if (!invesment) return;
  await getAverageCost(this.investment as any);
});

TransactionSchema.pre("findOneAndUpdate", async function (next) {
  // Extract the updated fields from this object to check if 'price' is being updated.
  const update = this.getUpdate() as ITransaction;
  if (update && update.price) {
    // Assuming `update.price` is the price to be converted and you want to handle currency conversion before update.
    const newPrice = update.price as any;
    // Find related asses
    const investment = await Investment.findById(update.investment)
      .select("asset")
      .populate("asset");

    if (!investment) return next();
    const currency = investment.asset.currency;

    // Update the price in the update object directly
    update.price = await getConvertedPrice(currency, newPrice);
  }

  next(); // Proceed with the update operation
});

// Call getAverageCost after update
TransactionSchema.post("findOneAndUpdate", async function (next) {
  const transactionId = (this as any)._conditions._id;
  const transaction = await Transaction.findById(transactionId);
  if (transaction) {
    getAverageCost(transaction?.investment as any);
  }
  next();
});

// Call getAverageCost before delete
TransactionSchema.pre("findOneAndDelete", async function (next) {
  const transactionId = (this as any)._conditions._id;
  const transaction = await Transaction.findById(transactionId);
  if (transaction) {
    getAverageCost(transaction?.investment as any);
  }
  next();
});

// Mongoose model export
const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);

export default Transaction;
