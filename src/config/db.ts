import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit the process with failure
  }
};

export default connectDB;
