import mongoose, { Document, Schema } from "mongoose";
import Investment, { IInvestment } from "./Investment";
import { AssetMarket, Currency, TransactionType } from "../utils/enums";
import { IPrice } from "./Asset"; // Importing IPrice to reference asset prices
import { getAssetPrices, getCurrencyAssets } from "../utils/price-setter";
import ErrorResponse from "../utils/errorResponse";
import { getCurrencyRates } from "../utils/currency-converter";

export interface ITransaction extends Document {
  _id: string;
  investment: IInvestment;
  price: IPrice; // Track the price for each transaction in different currencies
  quantity: number;
  type: TransactionType;
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

const getAverageCost = async function (investmentId: string) {
  try {
    // Fetch investment with asset population
    const investment = await Investment.findById(investmentId).populate(
      "asset"
    );
    const asset = investment?.asset; // Get the associated asset
    const assetMarket = asset?.market;

    // Determine the default currency based on asset market
    let defaultCurrency: Currency;
    switch (assetMarket) {
      case AssetMarket.TRStock:
      case AssetMarket.Exchange:
      case AssetMarket.Fund:
      case AssetMarket.Commodity:
        defaultCurrency = Currency.TRY;
        break;
      case AssetMarket.USAStock:
      case AssetMarket.Indicies:
      case AssetMarket.Crypto:
        defaultCurrency = Currency.USD;
        break;
      default:
        throw new Error("Unknown asset market.");
    }

    // Use Mongoose aggregation to calculate totalAmount and totalQuantity
    const [result] = await Transaction.aggregate([
      { $match: { investment: new mongoose.Types.ObjectId(investmentId) } }, // Match transactions for this investment
      {
        $project: {
          priceInDefaultCurrency: {
            $ifNull: [{ $arrayElemAt: [`$price.${defaultCurrency}`, 0] }, 0],
          },
          quantity: 1,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: { $multiply: ["$priceInDefaultCurrency", "$quantity"] },
          },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    if (!result) {
      console.log("No transactions found for this investment.");
      return;
    }

    const { totalAmount, totalQuantity } = result;

    // Calculate the average cost
    if (totalQuantity > 0) {
      const averageCost = totalAmount / totalQuantity;

      // Fetch currency assets for USD and EUR to get conversion rates
      const [EURAsset, USDAsset] = await getCurrencyAssets();

      if (!USDAsset?.price.try || !EURAsset?.price.try) {
        return new ErrorResponse("USDAsset or EURAsset not found", 404);
      }

      // Extract conversion rates for USD and EUR to TRY
      const usdRate = USDAsset.price.try;
      const eurRate = EURAsset.price.try;
      const rates = getCurrencyRates(usdRate, eurRate);

      // Convert the average cost into the appropriate currencies
      const avg_price = getAssetPrices(defaultCurrency, averageCost, rates);

      // Update the investment with the calculated average cost and quantity
      await Investment.findByIdAndUpdate(investmentId, {
        avg_price: avg_price,
        amount: totalQuantity,
      });

      console.log("Average cost updated:", averageCost);
    }
  } catch (error) {
    console.error("Error calculating average cost:", error);
  }
};

// Call getAverageCost after save
TransactionSchema.post("save", async function () {
  getAverageCost(this.investment as any);
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
