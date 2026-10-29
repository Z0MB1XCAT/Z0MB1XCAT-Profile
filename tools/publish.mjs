/* Builds everything and puts it live, in one go:

     npm run publish -- "Results from Zandvoort"

   1. builds the pages and news posts       (tools/build.mjs)
   2. prints the driver sheet PDF again     (tools/make-sheet.mjs)
   3. commits every change with your message and pushes it to GitHub

   GitHub Pages then updates the site within a minute or two. */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const message = process.argv.slice(2).join(' ').trim() || 'Update the site';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const read = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();

console.log('\n1. Building the pages');
run(process.execPath, ['tools/build.mjs']);

console.log('\n2. Printing the driver sheet');
run(process.execPath, ['tools/make-sheet.mjs']);

console.log('\n3. Sending it to GitHub');
run('git', ['add', '-A']);
if (!read('git', ['status', '--porcelain'])) {
  console.log('Nothing has changed since the last publish.');
  process.exit(0);
}
run('git', ['commit', '-m', message]);
run('git', ['push']);
console.log('\nDone. The site updates in a minute or two: https://z0mb1xcat.github.io/Z0MB1XCAT-Profile/');
