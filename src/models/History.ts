import mongoose, { Document, Schema } from "mongoose";
import { IAsset, IPrice } from "./Asset";
import { Currency } from "../utils/enums";

export interface IHistory extends Document {
  _id: string;
  asset: IAsset;
  close_price: IPrice;
}

const HistorySchema: Schema<IHistory> = new Schema(
  {
    close_price: {
      type: Object,
      required: true,
      default: {
        [Currency.TRY]: 0,
        [Currency.EUR]: 0,
        [Currency.USD]: 0,
      },
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Asset",
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

HistorySchema.index({ asset: 1, createdAt: -1 });

// Mongoose modelini dışa aktarıyoruz
const History = mongoose.model<IHistory>("History", HistorySchema);

export default History;
