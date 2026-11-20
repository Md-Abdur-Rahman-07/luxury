import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const domain = 'https://orbickwick.com';
const pages = ['index.html', 'about.html', 'contact.html', 'winery.html', 'food.html', 'brewery.html', 'night-life.html'];
const errors = [];
const summaries = [];
const checkedReferences = new Set();
const referencedAssets = new Set();
const pageCache = new Map();
const titles = new Map();
const descriptions = new Map();
const report = (file, message) => errors.push(`${file}: ${message}`);
const read = file => readFileSync(path.join(root, file), 'utf8');
const decode = value => String(value).replace(/&(?:amp|quot|apos|lt|gt|copy|nbsp);|&#(?:x[\da-f]+|\d+);/gi, entity => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&copy;': '©', '&nbsp;': ' ' };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === 'x' ? 3 : 2, -1), entity[2].toLowerCase() === 'x' ? 16 : 10));
});
const textContent = html => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attributes = source => Object.fromEntries([...source.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? '')]));
const tags = html => [...html.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(match => ({ name: match[1].toLowerCase(), attrs: attributes(match[2]), index: match.index }));

function loadPage(file) {
  if (!pageCache.has(file)) {
    const html = read(file);
    // Templates are inert: duplicate detail-title IDs do not exist in the DOM.
    const rendered = html.replace(/<template\b[\s\S]*?<\/template>/gi, '');
    pageCache.set(file, { html, rendered, tags: tags(html), ids: new Set(tags(rendered).map(tag => tag.attrs.id).filter(Boolean)) });
  }
  return pageCache.get(file);
}

function checkReference(file, rawReference, checkAnchor = false) {
  const reference = decode(rawReference).trim();
  if (!reference || /^(?:mailto:|tel:|data:|blob:)/i.test(reference)) return;
  const key = `${file}|${reference}|${checkAnchor}`;
  if (checkedReferences.has(key)) return;
  checkedReferences.add(key);
  let target;
  try { target = new URL(reference, `${domain}/${file.replaceAll('\\', '/')}`); }
  catch { report(file, `Invalid local reference: ${reference}`); return; }
  if (target.origin !== domain) return;
  let relative;
  try { relative = decodeURIComponent(target.pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { report(file, `Invalid encoded path: ${reference}`); return; }
  const absolute = path.resolve(root, relative);
  const resolvedRelative = path.relative(root, absolute).replaceAll('\\', '/');
  if (resolvedRelative.startsWith('../') || path.isAbsolute(resolvedRelative) || !existsSync(absolute) || !statSync(absolute).isFile()) {
    report(file, `Missing local target: ${reference}`);
    return;
  }
  if (/\.(?:avif|webp|jpe?g|png|gif|svg|ico|css|m?js|woff2?|ttf|otf|eot|mp4|webm)$/i.test(resolvedRelative) && !resolvedRelative.startsWith('assets/') && resolvedRelative !== 'favicon.ico') {
    report(file, `Site assets must live under assets/: ${reference}`);
  }
  if (resolvedRelative.startsWith('assets/')) referencedAssets.add(resolvedRelative);
  if (checkAnchor && target.hash && /\.html$/i.test(relative)) {
    const anchor = decodeURIComponent(target.hash.slice(1));
    if (!loadPage(relative).ids.has(anchor)) report(file, `Missing anchor: ${reference}`);
  }
}

function checkStructuredReferences(file, value) {
  if (Array.isArray(value)) value.forEach(item => checkStructuredReferences(file, item));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => checkStructuredReferences(file, item));
  else if (typeof value === 'string' && (value.startsWith(`${domain}/`) || value.startsWith('assets/'))) {
    checkReference(file, value.startsWith('assets/') ? `/${value}` : value);
  }
}

for (const file of pages) {
  if (!existsSync(path.join(root, file))) { report(file, 'Page is missing'); continue; }
  const page = loadPage(file);
  const titleTags = [...page.html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const title = textContent(titleTags[0]?.[1] || '');
  const metaDescriptions = page.tags.filter(tag => tag.name === 'meta' && tag.attrs.name === 'description');
  const description = metaDescriptions[0]?.attrs.content?.trim();
  if (titleTags.length !== 1 || !title) report(file, 'Needs exactly one nonempty title');
  if (metaDescriptions.length !== 1 || !description) report(file, 'Needs exactly one nonempty meta description');
  if (titles.has(title)) report(file, `Title duplicates ${titles.get(title)}`);
  if (descriptions.has(description)) report(file, `Meta description duplicates ${descriptions.get(description)}`);
  titles.set(title, file);
  descriptions.set(description, file);
  if (page.tags.find(tag => tag.name === 'html')?.attrs.lang !== 'en') report(file, 'Document language must be en');
  if ((page.rendered.match(/<h1\b/gi) || []).length !== 1) report(file, 'Needs exactly one H1');
  const canonical = page.tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'canonical');
  const expected = `${domain}/${file === 'index.html' ? '' : file}`;
  if (canonical.length !== 1 || canonical[0]?.attrs.href !== expected) report(file, `Expected canonical ${expected}`);
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!page.tags.some(tag => tag.name === 'meta' && tag.attrs.property === property && tag.attrs.content)) report(file, `Missing ${property}`);
  }
  for (const match of page.html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { checkStructuredReferences(file, JSON.parse(match[1])); } catch { report(file, 'Invalid JSON-LD'); }
  }

  for (const tag of page.tags) {
    const disabledSocial = tag.name === 'a' && (tag.attrs.class || '').split(/\s+/).includes('social-link') && tag.attrs.role === 'link' && tag.attrs['aria-disabled'] === 'true';
    if (tag.name === 'a' && !Object.hasOwn(tag.attrs, 'href') && !disabledSocial) report(file, 'Link target is missing');
    if (tag.attrs.href !== undefined) {
      if (!tag.attrs.href.trim()) report(file, 'Empty link target');
      checkReference(file, tag.attrs.href, tag.name === 'a');
    }
    if (tag.attrs.src) checkReference(file, tag.attrs.src);
    if (tag.attrs.poster) checkReference(file, tag.attrs.poster);
    if (tag.attrs.srcset) for (const candidate of tag.attrs.srcset.split(',')) checkReference(file, candidate.trim().split(/\s+/)[0]);
    if (tag.name === 'meta' && ['og:image', 'twitter:image'].includes(tag.attrs.property || tag.attrs.name)) checkReference(file, tag.attrs.content);
    if (tag.name === 'img' && !Object.hasOwn(tag.attrs, 'alt')) report(file, 'Image is missing alt text');
    if (tag.name === 'a' && tag.attrs.target === '_blank' && !/\bnoopener\b/.test(tag.attrs.rel || '')) report(file, 'New-tab link needs rel="noopener"');
    if (tag.name === 'a' && tag.attrs.href) {
      try {
        const hostname = new URL(tag.attrs.href, domain).hostname.toLowerCase().replace(/^www\./, '');
        if (['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'venmo.com'].includes(hostname)) report(file, 'Social profile links must remain unconfigured');
      } catch { /* Invalid references are reported by checkReference above. */ }
    }
  }

  const footer = page.html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] || '';
  const footerText = textContent(footer);
  if (!footerText.includes('Website Showcase © 2026')) report(file, 'Footer copyright does not match');
  if (!footerText.includes('Designed and developed by OrbitWick')) report(file, 'Footer design credit does not match');
  if (!/<a\b[^>]*href="https:\/\/orbitwick\.com"[^>]*>\s*OrbitWick\s*<\/a>/i.test(footer)) report(file, 'OrbitWick credit URL is missing');

  // Unconfigured social controls intentionally have no href. Requiring their
  // disabled semantics keeps blank showcase links distinct from broken links.
  const footerTags = tags(footer);
  const socialLinks = footerTags.filter(tag => tag.name === 'a' && (tag.attrs.class || '').split(/\s+/).includes('social-link'));
  if (socialLinks.length !== 3) report(file, 'Footer needs exactly three unconfigured social links');
  for (const platform of ['Instagram', 'Facebook', 'LinkedIn']) {
    const matching = socialLinks.filter(tag => tag.attrs['aria-label'] === `${platform} (link not configured)`);
    if (matching.length !== 1) report(file, `Footer needs one accessible ${platform} social control`);
  }
  for (const social of socialLinks) {
    if (Object.hasOwn(social.attrs, 'href')) report(file, 'Unconfigured social links must omit href entirely');
    if (social.attrs.role !== 'link' || social.attrs['aria-disabled'] !== 'true' || social.attrs.tabindex !== '0') {
      report(file, 'Unconfigured social controls need link role, aria-disabled="true", and tabindex="0"');
    }
  }
  const backToTop = page.tags.filter(tag => tag.name === 'button' && (tag.attrs.class || '').split(/\s+/).includes('back-to-top'));
  if (backToTop.length !== 1 || backToTop[0]?.attrs.type !== 'button' || backToTop[0]?.attrs['aria-label'] !== 'Back to top') {
    report(file, 'Needs one accessible Back to top button');
  }

  const forms = [...page.html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)];
  for (const match of forms) {
    const form = attributes(match[1]);
    const markup = match[2];
    if (form.method?.toLowerCase() !== 'post') report(file, 'Inquiry form must use POST');
    if (form.action !== 'mail/mail.php') report(file, 'Inquiry form action must preserve the mail handler');
    else checkReference(file, form.action);
    const labels = [...markup.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)].map(label => ({ attrs: attributes(label[1]), markup: label[2], start: label.index, end: label.index + label[0].length }));
    for (const control of tags(markup).filter(tag => ['input', 'select', 'textarea'].includes(tag.name) && !['hidden', 'submit', 'button'].includes(tag.attrs.type))) {
      const labelled = control.attrs['aria-label'] || control.attrs['aria-labelledby'] || labels.some(label => (control.attrs.id && label.attrs.for === control.attrs.id) || (control.index > label.start && control.index < label.end));
      if (!labelled) report(file, `Unlabelled form control: ${control.attrs.name || control.name}`);
    }
    if (!/<button\b[^>]*type="submit"/i.test(markup)) report(file, 'Inquiry form needs a submit button');
  }
  if (['index.html', 'contact.html'].includes(file) && forms.length !== 1) report(file, 'Expected one inquiry form');
  summaries.push(`${file}: SEO, headings, links, imagery, footer social controls, Back to top${forms.length ? ' and form labels' : ''} checked`);
}

function walk(directory) {
  if (!existsSync(path.join(root, directory))) return [];
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const catalogueFile = 'data/venues.json';
if (!existsSync(path.join(root, catalogueFile))) report(catalogueFile, 'Venue catalogue is missing');
else {
  try {
    const venues = JSON.parse(read(catalogueFile));
    if (!Array.isArray(venues) || venues.length === 0) report(catalogueFile, 'Venue catalogue must be a nonempty array');
    else {
      const ids = new Set();
      for (const venue of venues) {
        if (!Number.isInteger(venue.id) || ids.has(venue.id)) report(catalogueFile, `Venue ID must be a unique integer: ${venue.id}`);
        ids.add(venue.id);
        if (typeof venue.name !== 'string' || !venue.name.trim()) report(catalogueFile, `Venue ${venue.id} needs a name`);
        if (typeof venue.image !== 'string' || !venue.image.startsWith('assets/')) report(catalogueFile, `Venue ${venue.id} needs an asset image path`);
      }
      checkStructuredReferences(catalogueFile, venues);
    }
  } catch { report(catalogueFile, 'Venue catalogue contains invalid JSON'); }
}

const obsoletePaths = ['public_html', 'public_html.zip', 'css', 'js', 'fonts', 'images', 'img', 'data.js'];
for (const file of obsoletePaths) {
  if (existsSync(path.join(root, file))) report(file, 'Obsolete duplicate output or legacy asset path remains');
}

const siteFiles = [...pages, catalogueFile, 'favicon.ico', 'robots.txt', 'sitemap.xml', ...['assets', 'mail'].flatMap(walk)];
for (const file of siteFiles) {
  if (!existsSync(path.join(root, file))) continue;
  const normalized = file.replaceAll('\\', '/');
  const vendor = /(?:^|\/)(?:PHPMailer|plugins)(?:\/|$)|\.min\.(?:js|css)$/.test(normalized);
  if (!vendor && /\.(?:html|css|js|php|svg|json|txt|xml)$/i.test(file)) {
    const content = read(file);
    if (/black[\s_-]*label|theblacklabelcollective/i.test(content)) report(file, 'Previous branding remains in site-owned text');
    if (/\.css$/i.test(file)) for (const match of content.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) checkReference(file, match[1]);
  }
}
for (const file of ['robots.txt', 'sitemap.xml']) {
  if (!existsSync(path.join(root, file)) || !read(file).includes(domain)) report(file, `Needs ${domain}`);
}
for (const file of ['README.md', 'package.json', ...walk('scripts')].filter(file => existsSync(path.join(root, file)) && path.basename(file) !== 'check-site.mjs')) {
  const content = read(file);
  if (/black[\s_-]*label|theblacklabelcollective/i.test(content)) report(file, 'Previous branding remains in site source');
  if (/public_html|package-site\.ps1|optimize-images\.ps1|\bdata\.js\b/i.test(content)) report(file, 'Source still refers to obsolete output or asset tooling');
}

const assetFiles = walk('assets').map(file => file.replaceAll('\\', '/'));
for (const file of assetFiles) {
  if (referencedAssets.has(file)) continue;
  // License/source notes and editable source PNGs accompany shipped assets.
  if (/\.(?:md|txt)$/i.test(file) || /(?:^|\/)(?:LICENSE|OFL)(?:\.[^/]*)?$/i.test(file)) continue;
  if (/\.png$/i.test(file) && (/\/(?:hero)\//i.test(file) || /(?:^|[-_.])(?:source|original)(?:[-_.]|$)/i.test(path.basename(file)))) continue;
  // Keep a responsive variant only while its principal image is in use.
  const principal = file.replace(/-(?:mobile|small|medium|large|desktop|\d{2,4}w)(?=\.[^.]+$)/i, '');
  if (principal !== file && referencedAssets.has(principal)) continue;
  report(file, 'Asset is not referenced by the pages, styles, metadata, or venue catalogue');
}

if (errors.length) {
  console.error(`Site checks failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Site checks passed: ${pages.length} pages, ${checkedReferences.size} unique local references, ${assetFiles.length} organized assets.\n${summaries.join('\n')}`);
}
