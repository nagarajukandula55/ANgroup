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

// Hard outer ceiling on the ENTIRE connect attempt, including the initial
// `mongodb+srv://` DNS SRV-record lookup the driver does before it even
// starts server selection. That SRV lookup is NOT covered by
// serverSelectionTimeoutMS — if DNS resolution stalls (which happens
// intermittently between some serverless networks and Atlas), the whole
// connect() call can hang forever with no timeout at all. When that
// happens the platform eventually kills the function with no response,
// which the UI experiences as "the page never loads" and shows up in
// logs as a request with no completed status and no visible error.
// Racing against a plain timer guarantees we always get SOMETHING back.
const CONNECT_CEILING_MS = 9000;

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`MongoDB connection attempt exceeded ${ms}ms (DNS/network stall)`)),
      ms
    );
  });
}

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

    cached.promise = Promise.race([
      mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        // Production pool + timeout settings. The mongoose default
        // serverSelectionTimeoutMS is 30s — when the DB is unreachable every
        // API request hangs for 30 seconds, which the UI experiences as
        // "page frozen on the loading screen". Fail fast instead.
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      }),
      timeoutAfter(CONNECT_CEILING_MS),
    ]);
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
