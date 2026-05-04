import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;

    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const username = args.username || process.env.TEACHER_USERNAME || 'teacher';
const password = args.password || process.env.TEACHER_PASSWORD;
const rounds = Number(process.env.BCRYPT_ROUNDS ?? '10');

if (!password) {
  throw new Error('TEACHER_PASSWORD is required');
}

if (!Number.isFinite(rounds) || rounds < 4) {
  throw new Error('BCRYPT_ROUNDS must be a number >= 4');
}

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const teacherRole = await prisma.role.findUnique({ where: { key: 'teacher' } });
  if (!teacherRole) {
    throw new Error('Teacher role not found. Run migrations and seed first.');
  }

  const passwordHash = await bcrypt.hash(password, rounds);
  const teacher = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      status: 'ACTIVE'
    },
    create: {
      username,
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

  console.log(`Teacher password reset completed for ${teacher.username}`);
}

main()
  .catch((error) => {
    console.error('Teacher password reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
