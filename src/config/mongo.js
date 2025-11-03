const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client, db;

async function connectMongo() {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  await db.collection('forecasts').createIndex({ createdAt: -1 });
  await db.collection('forecasts').createIndex({ 'predictions.ds': 1 });
  return db;
}

module.exports = { connectMongo };