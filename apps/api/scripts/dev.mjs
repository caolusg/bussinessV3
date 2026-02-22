import { spawn } from 'node:child_process';

const run = (command, args, name) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      if (code === 0) return resolve(undefined);
      reject(new Error(`${name} exited with code ${code}`));
    });
  });

const spawnLive = (command, args) =>
  spawn(command, args, { stdio: 'inherit', shell: true });

const main = async () => {
  await run('npx', ['tsc', '-p', 'tsconfig.json'], 'tsc');

  const tscWatch = spawnLive('npx', ['tsc', '-w', '-p', 'tsconfig.json', '--preserveWatchOutput']);
  const nodeRun = spawnLive('node', ['dist/index.js']);

  const shutdown = (code = 0) => {
    tscWatch.kill();
    nodeRun.kill();
    process.exit(code);
  };

  tscWatch.on('exit', (code) => shutdown(code ?? 1));
  nodeRun.on('exit', (code) => shutdown(code ?? 1));

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
