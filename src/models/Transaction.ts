import mongoose, { Document, Schema } from 'mongoose';
import { IInvest } from './Invest';
import { Currency } from '../utils/enums';

export interface ITransaction extends Document {
  currency: Currency;
  invest: IInvest;
  price: number
  quantity: number
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    currency: {
        enum: [Currency.EUR, Currency.TRY, Currency.USD],
        default: Currency.TRY,
    },
    invest: {
        type: mongoose.Schema.ObjectId,
        ref: 'Invest',
        required: true
      },
      price: {
        type: Number,
        default: 0
      },
      quantity: {
        type: Number,
        default: 0
      }
  },
  { timestamps: true } 
);



// Mongoose modelini dışa aktarıyoruz
const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
