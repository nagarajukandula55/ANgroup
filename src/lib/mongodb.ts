import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is missing')
}

export async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return
  }

  await mongoose.connect(MONGODB_URI)
}
