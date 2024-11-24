import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import Asset from './Asset';

export interface IAccount extends Document {
  name: string;
  user: IUser;
}

const AccountSchema: Schema<IAccount> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      default: "Account"
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      }
  },
  { timestamps: true ,toJSON: { virtuals: true },
  toObject: { virtuals: true }} 
);

// Cascade delete accounts when a Account is deleted
AccountSchema.pre("findOneAndDelete",  async function(next) {
  const accountId = (this as any)._conditions._id;

    // Access the document via 'this' when the middleware is set to { document: true, query: false }
    console.log(`Account ${accountId} is being deleted. Deleting related assets.`);
    
    // Cascade delete accounts related to this Account
    await Asset.deleteMany({ account: accountId });

    next(); // Proceed with the delete operation
});

// Reverse populate with virtuals
AccountSchema.virtual('assets', {
  ref: 'Asset',
  localField: '_id',
  foreignField: 'account',
  justOne: false
});

// Mongoose modelini dışa aktarıyoruz
const Account = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
