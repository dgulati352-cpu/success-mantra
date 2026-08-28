import { useEffect } from 'react';

/**
 * useSEO - Custom hook for managing dynamic page metadata and SEO.
 * @param {Object} seoOptions
 * @param {string} seoOptions.title - Page title
 * @param {string} seoOptions.description - Meta description
 * @param {string} [seoOptions.keywords] - Comma separated keywords
 * @param {string} [seoOptions.canonical] - Canonical URL
 * @param {string} [seoOptions.ogImage] - Open Graph image preview
 * @param {string} [seoOptions.ogType] - Open Graph type (website, article, product)
 */
export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = 'https://www.camanishkalra.com/logo.png',
  ogType = 'website'
} = {}) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = `${title} | Success Mantra — CA Manish Kalra`;
    }

    // 2. Update Helper
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 3. Meta Descriptions & Keywords
    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }

    // 4. Open Graph & Twitter Titles
    if (title) {
      setMetaTag('property', 'og:title', `${title} | Success Mantra Academy`);
      setMetaTag('name', 'twitter:title', `${title} | CA Manish Kalra`);
    }

    // 5. Open Graph Images & Types
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('name', 'twitter:image', ogImage);
    setMetaTag('property', 'og:type', ogType);

    // 6. Canonical URL
    if (canonical || typeof window !== 'undefined') {
      const canonicalUrl = canonical || window.location.href;
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonicalUrl);
      setMetaTag('property', 'og:url', canonicalUrl);
      setMetaTag('name', 'twitter:url', canonicalUrl);
    }
  }, [title, description, keywords, canonical, ogImage, ogType]);
}
