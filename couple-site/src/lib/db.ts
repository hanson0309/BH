import mongoose from "mongoose";

import { env } from "@/lib/env";

declare global {
  var mongooseConn: {
    promise: Promise<typeof mongoose> | null;
    conn: typeof mongoose | null;
  } | undefined;
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConn?: {
    promise: Promise<typeof mongoose> | null;
    conn: typeof mongoose | null;
  };
};

export async function connectToDatabase() {
  if (!globalForMongoose.mongooseConn) {
    globalForMongoose.mongooseConn = { conn: null, promise: null };
  }

  if (globalForMongoose.mongooseConn.conn) return globalForMongoose.mongooseConn.conn;

  if (!globalForMongoose.mongooseConn.promise) {
    globalForMongoose.mongooseConn.promise = mongoose
      .connect(env.MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => m);
  }

  globalForMongoose.mongooseConn.conn = await globalForMongoose.mongooseConn.promise;
  return globalForMongoose.mongooseConn.conn;
}
