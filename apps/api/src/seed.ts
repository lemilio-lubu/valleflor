import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './database/data-source';
import { User, UserRole } from './users/user.entity';

const DEFAULT_ADMIN_EMAIL = 'admin@valleflor.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

function getAdminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (password) {
    return { email, password };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required in production to run admin seed.');
  }

  return { email, password: DEFAULT_ADMIN_PASSWORD };
}

async function runAdminSeed() {
  const { email, password } = getAdminCredentials();
  await AppDataSource.initialize();

  try {
    const userRepo = AppDataSource.getRepository(User);
    const existingAdmin = await userRepo.findOne({ where: { email } });

    if (existingAdmin) {
      if (existingAdmin.role !== UserRole.ADMIN) {
        existingAdmin.role = UserRole.ADMIN;
        await userRepo.save(existingAdmin);
        console.log(`Seed admin: user ${email} existed and role was updated to admin.`);
      } else {
        console.log(`Seed admin: user ${email} already exists.`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminUser = userRepo.create({
      email,
      passwordHash,
      role: UserRole.ADMIN,
    });

    await userRepo.save(adminUser);
    console.log(`Seed admin: created admin user ${email}.`);
  } finally {
    await AppDataSource.destroy();
  }
}

runAdminSeed().catch((error: unknown) => {
  console.error('Admin seed failed:', error);
  process.exit(1);
});
