const { readFileSync, readdirSync, writeFileSync, realpathSync } = require('node:fs');
const { resolve, relative, isAbsolute, sep } = require('node:path');
const { createHash } = require('node:crypto');
const [contentDirectory, publicDirectory] = process.argv.slice(2);
const paths = new Set();
function walk(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'src' && typeof child === 'string') paths.add(child); else walk(child);
  }
}
for (const file of readdirSync(resolve(contentDirectory, 'events')).filter(n => n.endsWith('.json'))) {
  walk(JSON.parse(readFileSync(resolve(contentDirectory, 'events', file), 'utf8')));
}
const root = realpathSync(publicDirectory);
const manifest = {};
for (const path of [...paths].sort()) {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\0]/.test(path) || path.split('/').includes('..')) throw new Error(`Unsafe image: ${path}`);
  const file = realpathSync(resolve(root, path.slice(1)));
  const child = relative(root, file);
  if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) throw new Error(`Image outside public: ${path}`);
  const bytes = readFileSync(file);
  manifest[path] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
writeFileSync(resolve(contentDirectory, 'image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Verified ${paths.size} legacy images.`);
