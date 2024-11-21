import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import Invest from './Invest';

export interface IAccount extends Document {
  name: string;
  user: IUser;
}

const AccountSchema: Schema<IAccount> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a fullname'],
      default: "Account"
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      }
  },
  { timestamps: true } 
);

// Cascade delete accounts when a Account is deleted
AccountSchema.pre("findOneAndDelete", { document: true, query: false }, async function(next) {
  const accountId = (this as any)._conditions._id;

  try {
    // Access the document via 'this' when the middleware is set to { document: true, query: false }
    console.log(`Account ${accountId} is being deleted. Deleting related invests.`);
    
    // Cascade delete accounts related to this Account
    await Invest.deleteMany({ account: accountId });

    next(); // Proceed with the delete operation
  } catch (error:any) {
    next(error); // If an error occurs, pass it to the next middleware
  }
});

// Reverse populate with virtuals
AccountSchema.virtual('invests', {
  ref: 'Invest',
  localField: '_id',
  foreignField: 'account',
  justOne: false
});

// Mongoose modelini dışa aktarıyoruz
const Account = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
