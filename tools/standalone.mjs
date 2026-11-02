// Inline the built bundle, styles and page into one double-clickable HTML file.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
let js = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');

js = js.replace(/<\/script>/gi, '<\\/script>');

html = html.replace(
  /<link\s+rel="stylesheet"\s+href="\.\/style\.css"\s*\/?>/i,
  `<style>\n${css}\n</style>`
);
html = html.replace(
  /<script\s+type="module"\s+src="\.\/dist\/app\.js"><\/script>/i,
  `<script type="module">\n${js}\n</script>`
);

const out = path.join(root, 'BigEarls-PV.html');
fs.writeFileSync(out, html);
console.log('[standalone]', out, (html.length / 1024 / 1024).toFixed(2) + ' MB');
