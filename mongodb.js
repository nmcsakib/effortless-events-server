import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = process.env.MONGODB_URI
import dotenv from 'dotenv';
dotenv.config();

export async function dbConnect(collectionName) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB URI not found in environment variables.");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const collection = db.collection(collectionName);
  if (!collection) throw new Error("Collection not found: " + collectionName);
  return collection;
}
