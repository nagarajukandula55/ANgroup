import mongoose from "mongoose";

const rawUri = process.env.NATIVE_MONGODB_URI;

if (!rawUri) {
  throw new Error("❌ NATIVE_MONGODB_URI is not defined");
}

const NATIVE_MONGODB_URI: string = rawUri;

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as any;

const cached: Cache = globalWithMongoose.nativeMongooseCache || {
  conn: null,
  promise: null,
};

globalWithMongoose.nativeMongooseCache = cached;

export async function connectNativeDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.createConnection(NATIVE_MONGODB_URI).asPromise();
  }

  cached.conn = await cached.promise;

  return cached.conn;
}
