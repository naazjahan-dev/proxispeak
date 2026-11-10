
import { connectDB, closeDB } from '../config/db.js';
import User from '../models/User.js';

async function promoteAdmin() {
  let exitCode = 0;

  try {
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
      throw new Error(
        'Email required. Example: npm run admin:promote -- testuser@example.com'
      );
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'admin' } },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      throw new Error(`No user found with email: ${email}`);
    }

    console.log('\nAdmin role assigned successfully!');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}\n`);

  } catch (error) {
    console.error('\nAdmin promotion failed:', error.message);
    exitCode = 1;

  } finally {
    await closeDB().catch(() => {});
    process.exitCode = exitCode;
  }
}

promoteAdmin();
