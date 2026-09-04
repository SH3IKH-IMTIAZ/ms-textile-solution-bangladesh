# Textile Solution Bangladesh

Static website for M/s Textile Solution Bangladesh, including product information, About, and Contact pages.

## Local preview

Serve this directory as the web server root because asset URLs start with `/`:

```sh
python3 -m http.server 5500
```

Open http://localhost:5500/ in your browser.

## Structure

- `index.html`: home page
- `about/` and `contact/`: company and contact pages
- `assets/site-theme.css`: shared site styling
- `assets/company-pages.css`: About and Contact styling
- `assets/site.js`: navigation, search, and contact form behavior
- `wp-content/`: exported styles, scripts, and media

The contact form opens an email draft in the visitor's email application; it does not send mail through a backend.
