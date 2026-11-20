# Luxury website showcase

A responsive private travel and destination guide website with seven semantic HTML pages, local photography and fonts, and progressive JavaScript interactions. The root HTML files are the single deployable site; no frontend dependency installation is required.

## Project structure

- `index.html`, `about.html`, `contact.html`, `winery.html`, `brewery.html`, `food.html`, and `night-life.html` are the generated public pages.
- `scripts/pages.mjs` contains Home, Our Story, and Contact content. `scripts/guides.mjs` renders the destination guides. `scripts/build-site.mjs` supplies the shared navigation, footer, metadata, sitemap, and robots output.
- `data/venues.json` is the source venue catalogue. It preserves the supplied venue information; check opening hours, reservations, and other details with each venue before commercial use.
- `assets/css/style.css` defines the visual design. `assets/js/site.js` and `assets/js/guides.js` provide navigation, forms, search, dialogs, FAQ, and motion enhancements.
- `assets/fonts/` holds self-hosted fonts and their licenses. `assets/images/` groups hero, editorial, venue, and brand imagery. The optimized images are the maintained source assets.
- `mail/` contains the PHP form handler and its bundled mail library. The root `favicon.ico` provides conventional browser icon support.

## Build, check, and preview

Run `npm run build` after editing page templates or venue data. It regenerates the seven root pages, `sitemap.xml`, and `robots.txt`.

Run `npm run check` to validate page metadata, heading structure, local links, image paths, form labels, footer controls, venue data, and asset organization.

Run `npm start` with PHP 8.1 or newer to preview the website at `http://127.0.0.1:4173`. Pages and guides remain usable without JavaScript; email delivery requires the PHP handler and configured SMTP credentials.

## Deploy

Build and check the site, then upload these public files and directories to a PHP-capable hosting document root:

- All seven root HTML pages
- `assets/` and `mail/`
- `favicon.ico`, `robots.txt`, and `sitemap.xml`

The generated HTML already contains the venue cards, so the source `data/` and `scripts/` directories are not needed on the host. Exclude Git metadata, editor configuration, local QA files, and other development-only files from the upload.

Canonical URLs, structured data, social metadata, and the sitemap target **https://orbickwick.com**. The footer developer credit links to **https://orbitwick.com**, as requested.

Configure SMTP environment variables on the host before enabling live inquiries; see [mail/README.md](mail/README.md). No credentials are committed. A submission reports success only after SMTP accepts it. Missing configuration produces a clear error and the `example@gmail.com` fallback. Offline validation does not verify live email delivery.

Photography sources and licenses are documented with the image assets; font notices are in `assets/fonts/`. Vehicle photography is illustrative and does not advertise a confirmed fleet. Guest reflections came from the supplied site.
