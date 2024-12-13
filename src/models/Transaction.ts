import mongoose, { Document, Schema } from "mongoose";
import Investment, { IInvestment } from "./Investment";
import { TransactionType } from "../utils/enums";

export interface ITransaction extends Document {
  investment: IInvestment;
  price: number;
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
      type: Number,
      default: 0,
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

// Ortalamayı hesaplayacak fonksiyon
const getAverageCost = async function (investmentId: string) {
  try {
    // Tüm işlemleri al
    const transactions = await Transaction.find({ investment: investmentId });

    let totalAmount = 0;
    let totalQuantity = 0;

    // Her işlem için döviz kuru dönüşümü yap
    for (const transaction of transactions) {
      totalAmount += transaction.price * transaction.quantity;
      totalQuantity += transaction.quantity;
    }
    // Ortalama maliyeti hesapla
    const averageCost = totalAmount / totalQuantity;

    await Investment.findByIdAndUpdate(investmentId, {
      avg_price: Number(averageCost.toFixed(2)), // En yakın 10'a yuvarlama
      amount: totalQuantity,
    });

    console.log("Ortalama maliyet TRY cinsinden güncellendi:", averageCost);
  } catch (error) {
    console.error("Ortalama maliyet hesaplama hatası:", error);
  }
};

// Call getAverageCost after save
TransactionSchema.post("save", async function () {
  getAverageCost(this.investment as any);
});

// Call getAverageCost after save
TransactionSchema.pre("findOneAndUpdate", async function (next) {
  const transactionId = (this as any)._conditions._id;
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) next();
  getAverageCost(transaction?.investment as any);
});

// Call getAverageCost before remove
TransactionSchema.pre("findOneAndDelete", function () {
  const transactionId = (this as any)._conditions._id;
  getAverageCost(transactionId);
});

// Mongoose modelini dışa aktarıyoruz
const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);

export default Transaction;
