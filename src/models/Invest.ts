import mongoose, { Document, Schema } from 'mongoose';
import { IAccount } from './Account';
import Transaction from './Transaction';

export interface IInvest extends Document {
  symbol: string;
  account: IAccount;
  avg_price: number
}

const InvestSchema: Schema<IInvest> = new Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Please add a symbol']
    },
    account: {
        type: mongoose.Schema.ObjectId,
        ref: 'Account',
        required: true
      },
      avg_price: {
        type: Number,
        default: 0
      }
  },
  { timestamps: true } 
);

// Cascade delete Invests when a Invest is deleted
InvestSchema.pre("findOneAndDelete", { document: true, query: false }, async function(next) {
  const investId = (this as any)._conditions._id;

  try {
    // Access the document via 'this' when the middleware is set to { document: true, query: false }
    console.log(`Invest ${investId} is being deleted. Deleting related transactions.`);
    
    // Cascade delete Invests related to this Invest
    await Transaction.deleteMany({ invest: investId });

    next(); // Proceed with the delete operation
  } catch (error:any) {
    next(error); // If an error occurs, pass it to the next middleware
  }
});

// Reverse populate with virtuals
InvestSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'invest',
  justOne: false
});

// Mongoose modelini dışa aktarıyoruz
const Invest = mongoose.model<IInvest>('Invest', InvestSchema);

export default Invest;
