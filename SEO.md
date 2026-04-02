# SEO Configuration Guide

## Google Analytics Setup

To enable Google Analytics for your site:

1. Create a Google Analytics 4 (GA4) property at https://analytics.google.com/
2. Get your Measurement ID (starts with `G-`)
3. In `index.html`, replace both instances of `G-PLACEHOLDER` with your actual Measurement ID

Example:
```
<!-- From: -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PLACEHOLDER"></script>
gtag('config', 'G-PLACEHOLDER', {

<!-- To: -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
gtag('config', 'G-ABC123XYZ', {
```

## SEO Files Added

- **robots.txt** - Instructs search engines how to crawl your site
- **sitemap.xml** - Lists all important URLs for search engine discovery
- **Enhanced HTML metadata** - Comprehensive Open Graph, Twitter Cards, and JSON-LD structured data

## Vercel Deployment

The `vercel.json` now includes:
- Proper cache control headers for static assets (1 year for versioned files, 1 hour for HTML)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Correct MIME types for XML and text files
- SPA fallback for client-side routing

## Performance & SEO

Already optimized:
- PWA support with offline capability
- Mobile-responsive design
- Code splitting via Vite
- Semantic HTML structure
- Fast page load times

## Next Steps

1. Install Google Analytics measurement ID
2. Submit your site to Google Search Console
3. Monitor Core Web Vitals in Search Console
4. Update sitemap.xml as you add more important pages
