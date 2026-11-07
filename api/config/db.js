const mongoose = require('mongoose');
const dns = require('dns');

// On environments where local ISP DNS fails on MongoDB SRV lookups,
// safely fall back to public DNS resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore in environments where setting DNS servers is restricted
}

// Fallback MongoDB connection string to ensure serverless functions never crash on cold boot
const DEFAULT_MONGODB_URI =
  'mongodb+srv://sickolife32_db_user:4byOpnRNootTKAsk@bala.gjyftfn.mongodb.net/conceptcards?retryWrites=true&w=majority';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless invocations in Vercel.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        console.log('MongoDB Atlas connection established successfully.');
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;
        console.error('MongoDB Atlas connection error:', error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;


