import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mainPages } from './pages.mjs';
import { guidePages } from './guides.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [...mainPages, ...guidePages];
const domain = 'https://orbickwick.com';
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const url = (file) => `${domain}/${file === 'index.html' ? '' : file}`;
const brand = `<span class="brand-name">Luxury<span class="brand-point">.</span></span><span class="brand-tagline">THE ART OF PRIVATE TRAVEL</span>`;
const fontPreloads = ['cormorant-garamond-latin', 'cormorant-garamond-italic-latin', 'manrope-latin']
  .map(name => `<link rel="preload" href="assets/fonts/${name}.woff2" as="font" type="font/woff2" crossorigin>`).join('');

function header(active) {
  const links = [['home', 'index.html', 'Home'], ['services', 'index.html#service', 'Services'], ['about', 'about.html', 'Our story'], ['experiences', 'index.html#discover', 'Experiences'], ['contact', 'contact.html', 'Contact']];
  return `<a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header"><div class="container header-inner"><a class="brand" href="index.html" aria-label="Luxury home">${brand}</a><button class="menu-toggle" aria-controls="primary-navigation" aria-expanded="false" aria-label="Open navigation"><span></span><span></span></button><nav class="primary-navigation" id="primary-navigation" aria-label="Main navigation">${links.map(([key, href, label]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}<a class="button button-outline nav-cta" href="index.html#quote">Plan your journey</a></nav></div></header>`;
}

function footer() {
  const socialIcons = {
    Instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
    Facebook: '<path d="M14.5 21v-8h3l.5-4h-3.5V7c0-1 .5-2 2-2H18V2h-2.5C12.5 2 11 4 11 7v2H8v4h3v8"/>',
    LinkedIn: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 10v7m4-7v7m0-4c0-4 5-4 5 0v4"/><circle cx="7.5" cy="7" r=".8" fill="currentColor" stroke="none"/>'
  };
  const socials = `<nav class="footer-socials" aria-label="Social media">${Object.entries(socialIcons).map(([name, icon]) => `<a class="social-link" role="link" aria-disabled="true" tabindex="0" aria-label="${name} (link not configured)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${icon}</svg><span>${name}</span></a>`).join('')}</nav>`;
  return `<footer class="site-footer"><div class="container"><div class="footer-main"><div class="footer-brand"><a class="brand" href="index.html" aria-label="Luxury home">${brand}</a><p>Considered journeys.<br>Extraordinary moments.</p></div><div><h2 class="eyebrow">Explore</h2><nav aria-label="Footer navigation"><a href="index.html#service">Our services</a><a href="about.html">Our story</a><a href="index.html#discover">Destination guides</a><a href="contact.html">Get in touch</a></nav></div><div class="footer-contact"><h2 class="eyebrow">Begin a conversation</h2><a href="mailto:example@gmail.com">example@gmail.com</a><p>Austin &amp; the Texas Hill Country</p><a class="text-link light-link" href="index.html#quote">Plan your journey</a>${socials}</div></div><div class="footer-bottom"><p>Website Showcase © 2026</p><p>Designed and developed by <a href="https://orbitwick.com" target="_blank" rel="noopener noreferrer">OrbitWick</a></p></div></div></footer><button class="back-to-top" type="button" aria-label="Back to top" hidden><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>`;
}

function layout(page) {
  const canonical = url(page.file);
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${domain}/#organization`, name: 'Luxury', url: domain, logo: `${domain}/assets/images/brand/logo.svg`, email: 'example@gmail.com' },
    { '@type': 'WebSite', '@id': `${domain}/#website`, url: domain, name: 'Luxury', publisher: { '@id': `${domain}/#organization` }, inLanguage: 'en-US' },
    { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: page.title, description: page.description, isPartOf: { '@id': `${domain}/#website` }, inLanguage: 'en-US' }
  ]};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#161a17"><title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/svg+xml" href="assets/images/brand/favicon.svg"><link rel="icon" href="favicon.ico" sizes="any"><link rel="apple-touch-icon" href="assets/images/brand/apple-touch-icon.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Luxury"><meta property="og:locale" content="en_US"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${domain}/${page.heroImage || 'assets/images/hero/hero-new.jpg'}"><meta property="og:image:alt" content="Luxury private travel and curated experiences"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${domain}/${page.heroImage || 'assets/images/hero/hero-new.jpg'}"><link rel="preload" href="assets/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="assets/css/style.css"><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script><script src="assets/js/site.js" defer></script>${page.guide ? '<script src="assets/js/guides.js" defer></script>' : ''}</head>
<body id="top" class="${page.file === 'index.html' ? 'home-page' : 'inner-page'}">${header(page.active)}<main id="main-content">${page.body}</main>${footer()}</body></html>\n`;
}

for (const page of pages) {
  let html = layout(page).replace(/[ \t]+$/gm, '');
  html = html.replace('<link rel="preload" href="assets/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossorigin>', fontPreloads);
  // Both / and /index.html keep home navigation within the current document.
  if (page.file === 'index.html') {
    html = html.replace(/href="index\.html(?:#([^"]+))?"/g, (_, hash) => `href="#${hash || 'top'}"`);
  }
  await writeFile(path.join(root, page.file), html);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${url(p.file)}</loc></url>`).join('\n')}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\nDisallow: /mail/\nDisallow: /scripts/\nDisallow: /data/\nSitemap: ${domain}/sitemap.xml\n`;
for (const [name, content] of [['sitemap.xml', sitemap], ['robots.txt', robots]]) {
  await writeFile(path.join(root, name), content);
}
console.log(`Built ${pages.length} Luxury pages in the site root.`);
