const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const matches = envFile.match(/^MONGODB_URI=(.*)$/m);
const MONGODB_URI = matches ? matches[1].trim() : null;

console.log('Parsed MONGODB_URI:', MONGODB_URI);

async function run() {
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found in .env.local');
    process.exit(1);
  }
  try {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log('Connected!');
    
    // Find all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
