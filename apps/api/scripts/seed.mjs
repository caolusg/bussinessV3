import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error']
});

const DEFAULT_TEACHER_USERNAME = process.env.DEFAULT_TEACHER_USERNAME ?? 'teacher';
const DEFAULT_TEACHER_PASSWORD = process.env.DEFAULT_TEACHER_PASSWORD ?? 'password123';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? '10');

if (!Number.isFinite(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 4) {
  throw new Error('BCRYPT_ROUNDS must be a number >= 4');
}

const ensureRole = async (key, name) =>
  prisma.role.upsert({
    where: { key },
    update: { name },
    create: { key, name }
  });

const main = async () => {
  const studentRole = await ensureRole('student', 'Student');
  const teacherRole = await ensureRole('teacher', 'Teacher');

  const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, BCRYPT_ROUNDS);
  const teacher = await prisma.user.upsert({
    where: { username: DEFAULT_TEACHER_USERNAME },
    update: {
      passwordHash,
      status: 'ACTIVE'
    },
    create: {
      username: DEFAULT_TEACHER_USERNAME,
      passwordHash,
      status: 'ACTIVE'
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: teacher.id,
        roleId: teacherRole.id
      }
    },
    update: {},
    create: {
      userId: teacher.id,
      roleId: teacherRole.id
    }
  });

  console.log('Database seed completed');
  console.log(`Roles ensured: ${studentRole.key}, ${teacherRole.key}`);
  console.log(`Default teacher ensured: ${teacher.username}`);
};

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
