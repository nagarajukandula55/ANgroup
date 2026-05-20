import mongoose, {
  Connection,
} from "mongoose";

const rawUri =
  process.env.NATIVE_MONGODB_URI;

if (!rawUri) {
  throw new Error(
    "❌ NATIVE_MONGODB_URI is not defined"
  );
}

const NATIVE_MONGODB_URI = rawUri;

type Cache = {
  conn: Connection | null;
  promise: Promise<Connection> | null;
};

const globalWithMongoose =
  global as typeof global & {
    nativeMongooseCache?: Cache;
  };

const cached =
  globalWithMongoose.nativeMongooseCache || {
    conn: null,
    promise: null,
  };

globalWithMongoose.nativeMongooseCache =
  cached;

export async function connectNativeDB(): Promise<Connection> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .createConnection(
        NATIVE_MONGODB_URI,
        {
          dbName: "native",
        }
      )
      .asPromise();
  }

  cached.conn = await cached.promise;

  console.log(
    "CONNECTED TO NATIVE DB:",
    cached.conn.name
  );

  return cached.conn;
}
