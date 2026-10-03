const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js', 'data', 'exercises.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const groups = context.window.LOCAL_EXERCISES?.stretchesByBodyPart || {};
const entries = Object.entries(groups).flatMap(([group, stretches]) =>
  stretches.map(stretch => ({ group, name: stretch.name, image: stretch.image || '' }))
);

async function audit() {
  const baseUrlArg = process.argv.find(value => value.startsWith('--base-url='));
  const baseUrl = baseUrlArg ? baseUrlArg.slice('--base-url='.length).replace(/\/$/, '') : '';
  const failures = [];

  for (const entry of entries) {
    const fullPath = path.join(ROOT, entry.image.replaceAll('/', path.sep));
    if (!entry.image || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      failures.push({ ...entry, reason: 'missing-file' });
      continue;
    }

    if (baseUrl) {
      const url = `${baseUrl}/${entry.image.split('/').map(encodeURIComponent).join('/')}`;
      try {
        const response = await fetch(url);
        if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/')) {
          failures.push({ ...entry, reason: `http-${response.status}`, contentType: response.headers.get('content-type') });
        }
      } catch (error) {
        failures.push({ ...entry, reason: 'request-failed', error: error.message });
      }
    }
  }

  console.log(JSON.stringify({ total: entries.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

audit().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
