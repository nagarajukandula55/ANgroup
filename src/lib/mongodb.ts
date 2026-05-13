import mongoose from "mongoose";

const rawUri = process.env.MONGODB_URI;

if (!rawUri) {
  throw new Error(
    "❌ MONGODB_URI is not defined in environment variables"
  );
}

// 🔒 now TS knows this is ALWAYS string
const MONGODB_URI: string = rawUri;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongooseCache || {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;

  return cached.conn;
}
