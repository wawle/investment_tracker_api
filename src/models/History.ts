import mongoose, { Document, Schema } from "mongoose";
import { IAsset } from "./Asset";

export interface IHistory extends Document {
  _id: string;
  asset: IAsset;
  close_price: number;
}

const HistorySchema: Schema<IHistory> = new Schema(
  {
    close_price: {
      type: Number,
      required: [true, "Please add a close_price"],
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Asset",
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Mongoose modelini dışa aktarıyoruz
const History = mongoose.model<IHistory>("History", HistorySchema);

export default History;
