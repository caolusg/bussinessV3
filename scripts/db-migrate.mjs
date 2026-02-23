import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

const migrationPath = join(
  repoRoot,
  'prisma',
  'migrations',
  '20260222210000_init_auth',
  'migration.sql'
);

const sql = await readFile(migrationPath, 'utf8');

const child = spawn(
  'docker',
  ['compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'bussinessv3', '-v', 'ON_ERROR_STOP=1'],
  { stdio: ['pipe', 'inherit', 'inherit'] }
);

child.stdin.write(sql);
child.stdin.end();

const exitCode = await new Promise((resolve) => child.on('close', resolve));
process.exit(exitCode ?? 1);
