import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/seoConfig';

/**
 * useSEO - Comprehensive hook for managing page metadata, Open Graph, Twitter cards,
 * canonical links, robots directives, and Schema.org JSON-LD structured data.
 *
 * @param {Object} options
 * @param {string} options.title - Exact title for the page
 * @param {string} options.description - Meta description (150-160 chars recommended)
 * @param {string} [options.keywords] - Keywords string
 * @param {string} [options.canonical] - Absolute or relative canonical URL
 * @param {string} [options.ogImage] - Open Graph image preview URL
 * @param {string} [options.ogType] - Open Graph type ('website', 'book', 'product', 'article')
 * @param {boolean} [options.noindex] - If true, sets robots to 'noindex, nofollow'
 * @param {Object|Array} [options.schema] - JSON-LD schema object or array of schema objects
 */
export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = SITE_CONFIG.defaultOgImage,
  ogType = 'website',
  noindex = false,
  schema = null
} = {}) {
  useEffect(() => {
    // 1. Title Tag
    if (title) {
      document.title = title;
    }

    // 2. Helper to set or create meta tags
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content && content !== '') return;
      let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 3. Robots Meta Tag
    const robotsContent = noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
    setMetaTag('name', 'robots', robotsContent);
    setMetaTag('name', 'googlebot', robotsContent);

    // 4. Meta Description & Keywords
    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }

    // 5. Open Graph & Twitter Titles
    if (title) {
      setMetaTag('property', 'og:title', title);
      setMetaTag('name', 'twitter:title', title);
    }

    // 6. Site Name & Locale
    setMetaTag('property', 'og:site_name', SITE_CONFIG.siteName);
    setMetaTag('property', 'og:locale', 'en_IN');

    // 7. Open Graph Image & Twitter Card
    const absoluteImage = ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.domain}${ogImage}`;
    setMetaTag('property', 'og:image', absoluteImage);
    setMetaTag('name', 'twitter:image', absoluteImage);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('property', 'og:type', ogType);

    // 8. Canonical URL
    let fullCanonical = SITE_CONFIG.domain;
    if (canonical) {
      fullCanonical = canonical.startsWith('http') ? canonical : `${SITE_CONFIG.domain}${canonical.startsWith('/') ? '' : '/'}${canonical}`;
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      fullCanonical = `${SITE_CONFIG.domain}${path === '/' ? '' : path}`;
    }

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', fullCanonical);
    setMetaTag('property', 'og:url', fullCanonical);
    setMetaTag('name', 'twitter:url', fullCanonical);

    // 9. Structured Data (JSON-LD)
    const existingSchemaScript = document.getElementById('dynamic-page-schema');
    if (existingSchemaScript) {
      existingSchemaScript.remove();
    }

    if (schema) {
      const script = document.createElement('script');
      script.id = 'dynamic-page-schema';
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup dynamically injected schema on unmount/route change
      const script = document.getElementById('dynamic-page-schema');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, keywords, canonical, ogImage, ogType, noindex, schema]);
}
