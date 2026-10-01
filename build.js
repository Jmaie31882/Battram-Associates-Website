#!/usr/bin/env node
// Tiny static site builder. No dependencies.
//
//   src/pages/*.html      page bodies with a JSON front-matter block
//   src/partials/*.html   shared header / footer / head
//   src/layout.html       the page shell, uses {{> partial}} and {{var}}
//   src/assets, css, js   copied to dist as-is
//
// Output goes to dist/. Pages become clean URLs: about.html -> /about/
// index.html stays at the root.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));

const read = (p) => fs.readFileSync(p, 'utf8');
const partials = Object.fromEntries(
  fs.readdirSync(path.join(SRC, 'partials'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), read(path.join(SRC, 'partials', f))])
);
const layout = read(path.join(SRC, 'layout.html'));

function render(tpl, vars) {
  // {{> name}} partials first (they may contain {{vars}})
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => {
    if (!(n in partials)) throw new Error(`Unknown partial: ${n}`);
    return partials[n];
  });
  // {{#if var}}...{{/if}}
  out = out.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, body) => (vars[k] ? body : ''));
  // {{var}}
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => (k in vars ? vars[k] : ''));
  return out;
}

function parsePage(file) {
  const raw = read(file);
  const m = raw.match(/^\s*<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) throw new Error(`${path.basename(file)} needs a JSON front-matter comment`);
  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length).trim();
  return { meta, body };
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const pages = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
const urls = [];
for (const f of pages) {
  const { meta, body } = parsePage(path.join(SRC, 'pages', f));
  const slug = f.replace(/\.html$/, '');
  const url = slug === 'index' ? '/' : slug === '404' ? '/404.html' : `/${slug}/`;
  const vars = {
    ...site,
    ...meta,
    body,
    url,
    slug,
    canonical: site.url.replace(/\/$/, '') + (url === '/404.html' ? '' : url),
    year: new Date().getFullYear(),
    ['nav_' + slug]: ' aria-current="page"',
  };
  vars.body = render(body, vars);           // partials/vars inside the page body
  const html = render(layout, vars);
  const outFile = slug === 'index' ? path.join(DIST, 'index.html')
    : slug === '404' ? path.join(DIST, '404.html')
    : path.join(DIST, slug, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  if (!meta.noindex && slug !== '404') urls.push(vars.canonical);
  console.log('built', url);
}

copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
copyDir(path.join(SRC, 'css'), path.join(DIST, 'css'));
copyDir(path.join(SRC, 'js'), path.join(DIST, 'js'));
for (const f of ['_headers', '_redirects', 'robots.txt']) {
  const p = path.join(SRC, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DIST, f));
}

fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);

console.log(`done: ${pages.length} pages -> dist/`);
