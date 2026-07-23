import { connectToDatabase } from '../src/app/lib/mongodb';
import UserMemory from '../src/app/models/UserMemory';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  console.log('Environment variable MONGODB_URI:', process.env.MONGODB_URI);
  try {
    console.log('Connecting...');
    await connectToDatabase();
    console.log('Connected. Finding user memory for "test"...');
    const user = await UserMemory.findOne({ userId: 'test' });
    console.log('Found user:', user);
  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    process.exit(0);
  }
}

run();
