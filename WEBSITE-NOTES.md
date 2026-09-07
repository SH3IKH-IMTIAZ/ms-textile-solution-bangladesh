# Website notes

The 21 static pages use assets/site-theme.css and assets/site.js. About and Contact also use assets/company-pages.css. Serve this folder as the web root.

Navigation and search run locally. The contact form validates its fields and opens an email draft; it does not send through a backend.

Asset cleanup: removed 42 query-bearing filenames, preserved existing clean versions, created clean filenames where necessary, and updated encoded references. Missing CSS backgrounds now use local imagery or a CSS pattern. Star ratings use Unicode stars instead of an absent icon font.

YouTube widgets and embeds were removed; local product images were retained where available. Unavailable blog pagination links were removed. The favicons and primary logo were resized and optimized, and header image references use the optimized logo.

All 21 pages include unique descriptions and canonical URLs on https://ms-textile-solution-bangladesh.com/. robots.txt no longer advertises absent sitemaps. Canonical URLs should be updated if the production domain changes.

The current contact form behavior and unavailable trolley-wheel PDF remain separate limitations. Website files must be committed and pushed before a Git-based deployment can include them.
