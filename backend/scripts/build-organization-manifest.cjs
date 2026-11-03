const { readFileSync, readdirSync, writeFileSync, realpathSync } = require('node:fs');
const { resolve, relative, isAbsolute, sep } = require('node:path');
const { createHash } = require('node:crypto');
const [contentRoot, publicDirectory] = process.argv.slice(2);
const keys = new Set(['bannerImage', 'groupPhotoImage', 'cardImage', 'photo', 'ballIcon', 'aboutImg', 'image', 'images', 'detailImages']);
const missing = new Set(['', '/eesa.jpg', '/intro/operations-group-photo.jpg', '/intro/publicity-group-photo.jpg', '/intro/technical-group-photo.jpg']);
const paths = new Set();
function walk(value, team, key = '') {
  if (Array.isArray(value)) value.forEach(v => walk(v, team, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v]) => walk(v, team, k));
  else if (typeof value === 'string' && keys.has(key)) { const path = team && value && !value.startsWith('/') ? `/team/${value}` : value; if (!missing.has(path)) paths.add(path); }
}
walk(JSON.parse(readFileSync(resolve(contentRoot, 'eesa/overview.json'), 'utf8')), false);
for (const directory of ['eesa/departments', 'teams']) for (const file of readdirSync(resolve(contentRoot, directory)).filter(n => n.endsWith('.json'))) walk(JSON.parse(readFileSync(resolve(contentRoot, directory, file), 'utf8')), directory === 'teams');
const root = realpathSync(publicDirectory);
const manifest = {};
for (const path of [...paths].sort()) {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\0]/.test(path) || path.split('/').includes('..')) throw new Error(`Unsafe image path: ${path}`);
  const file = realpathSync(resolve(root, path.slice(1))); const child = relative(root, file);
  if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) throw new Error(`Image outside public: ${path}`);
  const bytes = readFileSync(file);
  manifest[path] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
writeFileSync(resolve(contentRoot, 'organization-image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
