import mongoose from "mongoose";

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
    // Resolve the URI lazily (inside the function, not at module load).
    // A module-level throw breaks `next build`, which imports every route
    // module during "collecting page data" even though the env var is only
    // needed at runtime.
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Production pool + timeout settings. The mongoose default
      // serverSelectionTimeoutMS is 30s — when the DB is unreachable every
      // API request hangs for 30 seconds, which the UI experiences as
      // "page frozen on the loading screen". Fail fast instead.
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Un-poison the cache: without this, one failed connection attempt
    // leaves a permanently-rejected promise cached and every subsequent
    // request fails instantly until the server restarts.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
