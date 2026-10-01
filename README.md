# Battram Associates website

Static site for battramassociates.co.uk, hosted on Cloudflare Pages.
No framework, no dependencies: a 100-line Node script stitches shared
partials into each page and writes the result to `dist/`.

## Structure

    src/
      site.json        site-wide values (name, phone, address, base URL)
      layout.html      the page shell: <head>, header, footer, scripts
      partials/        header.html, footer.html, cta.html
      pages/           one file per page; JSON front-matter comment + body
      css/styles.css   the design system
      js/site.js       mobile menu
      assets/          favicon, touch icon, OG image, images
      _headers         Cloudflare Pages headers (security + staging noindex)
      _redirects       Old Wix URL -> new URL 301s (fill in before launch)
      robots.txt
    build.js           the builder
    dist/              build output (ignored by git; Cloudflare builds it)

## Editing

- Change wording: edit the page in `src/pages/`.
- Change the nav or footer: edit `src/partials/`.
- Add a page: create `src/pages/name.html` starting with
  `<!-- { "title": "...", "description": "..." } -->`. It is served at `/name/`.
- Phone, email, address: `src/site.json`.
- Use `{{> cta}}` to drop the dark "Have a project in mind?" band into any page.

## Build and preview

    npm run build      # writes dist/
    npm run dev        # builds and serves dist/ on http://localhost:3000

## Cloudflare Pages settings

- Build command: `node build.js`
- Build output directory: `dist`
- Node version: 18 or later (set `NODE_VERSION=20` in Pages env vars)

## Before launch

1. Fill in `src/_redirects` with every live Wix URL.
2. Change `url` in `src/site.json` to `https://www.battramassociates.co.uk`.
3. Remove the `new.battramassociates.co.uk` noindex block from `src/_headers`.
4. Update the `Sitemap:` line in `src/robots.txt`.
