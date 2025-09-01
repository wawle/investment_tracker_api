import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.NODE_ENV === "production"
        ? (process.env.MONGO_URI as string)
        : (process.env.MONGO_LOCAL_URI as string)
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit the process with failure
  }
};

export default connectDB;
