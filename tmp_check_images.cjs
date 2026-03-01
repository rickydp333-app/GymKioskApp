const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const file = path.join(root, 'js', 'data', 'exercises.js');
const code = fs.readFileSync(file, 'utf8');

const sandbox = { window: {}, console: { log: () => {} } };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'exercises.js' });

const data = sandbox.window.LOCAL_EXERCISES || {};
const unresolved = [];

function checkEntry(section, subgroup, entry) {
  if (!entry || typeof entry !== 'object') return;

  const image = entry.image;
  if (typeof image !== 'string' || image.trim() === '') {
    unresolved.push({
      section,
      ...(subgroup ? { subgroup } : {}),
      name: entry.name ?? null,
      image: image ?? null,
      issue: 'missing_image_field'
    });
    return;
  }

  const normalized = image.trim().replace(/[\\/]+/g, path.sep);
  const absolutePath = path.join(root, normalized);

  if (!fs.existsSync(absolutePath)) {
    unresolved.push({
      section,
      ...(subgroup ? { subgroup } : {}),
      name: entry.name ?? null,
      image: image.trim(),
      issue: 'image_file_not_found'
    });
  }
}

for (const [section, value] of Object.entries(data)) {
  if (Array.isArray(value)) {
    for (const entry of value) checkEntry(section, null, entry);
  } else if (value && typeof value === 'object') {
    for (const [subgroup, arr] of Object.entries(value)) {
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) checkEntry(section, subgroup, entry);
    }
  }
}

process.stdout.write(JSON.stringify(unresolved, null, 2));
