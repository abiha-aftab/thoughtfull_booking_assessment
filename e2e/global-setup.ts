import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default function globalSetup(): void {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/thoughtfull-booking';
  execFileSync('npm', ['run', 'seed', '-w', '@thoughtfull/api'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri },
  });
}
