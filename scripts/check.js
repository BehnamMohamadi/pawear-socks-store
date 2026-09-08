const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const roots = ['app.js', 'server.js', 'controller', 'models', 'routes', 'middleware', 'validation', 'services', 'utils', 'scripts', 'tests', 'public/javascript', 'public/js/admin'];
let failed = false, count = 0;
const check = p => { const stat = fs.statSync(p); if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p))
        check(path.join(p, entry));
    return;
} if (!p.endsWith('.js'))
    return; count++; const r = spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' }); if (r.status !== 0) {
    failed = true;
    console.error(r.stderr);
} };
roots.forEach(check);
console.log(count + ' JavaScript files checked');
process.exitCode = failed ? 1 : 0;
