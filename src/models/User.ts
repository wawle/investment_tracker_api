import mongoose, { Document, Schema } from 'mongoose';

// Kullanıcı modelinin tipini tanımlıyoruz
export interface IUser extends Document {
  fullname: string;
  email: string;
}

// Mongoose Schema tanımını yapıyoruz
const UserSchema: Schema<IUser> = new Schema(
  {
    fullname: {
      type: String,
      required: [true, 'Please add a fullname']
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    }
  },
  { timestamps: true } // createdAt ve updatedAt alanlarını otomatik olarak ekler
);

// Cascade delete accounts when a user is deleted
UserSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Access the document via 'this' when the middleware is set to { document: true, query: false }
    console.log(`User ${this._id} is being deleted. Deleting related accounts.`);
    
    // Cascade delete accounts related to this user
    await this.model('Account').deleteMany({ user: this._id });

    next(); // Proceed with the delete operation
  } catch (error:any) {
    next(error); // If an error occurs, pass it to the next middleware
  }
});

// Reverse populate with virtuals
UserSchema.virtual('accounts', {
  ref: 'Account',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// Mongoose modelini dışa aktarıyoruz
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
