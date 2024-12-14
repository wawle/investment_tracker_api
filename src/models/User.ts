import mongoose, { Document, Schema } from "mongoose";
import Account from "./Account";

// Kullanıcı modelinin tipini tanımlıyoruz
export interface IUser extends Document {
  _id: string;
  fullname: string;
  email: string;
}

// Mongoose Schema tanımını yapıyoruz
const UserSchema: Schema<IUser> = new Schema(
  {
    fullname: {
      type: String,
      required: [true, "Please add a fullname"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } } // createdAt ve updatedAt alanlarını otomatik olarak ekler
);

// Create company after save
UserSchema.post("save", async function () {
  const hasAccount = await Account.exists({ user: this._id });
  if (hasAccount) return;
  await Account.create({ user: this._id });
});

// Cascade delete accounts when a user is deleted
UserSchema.pre("findOneAndDelete", async function (next) {
  const userId = (this as any)._conditions._id;

  // Access the document via 'this' when the middleware is set to { document: true, query: false }
  console.log(`User ${userId} is being deleted. Deleting related accounts.`);

  // Cascade delete accounts related to this user
  await Account.deleteMany({ user: userId });

  next(); // Proceed with the delete operation
});

// Reverse populate with virtuals
UserSchema.virtual("accounts", {
  ref: "Account",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// Mongoose modelini dışa aktarıyoruz
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
