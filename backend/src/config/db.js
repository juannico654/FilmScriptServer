import mongoose from 'mongoose';
import process from 'node:process';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;