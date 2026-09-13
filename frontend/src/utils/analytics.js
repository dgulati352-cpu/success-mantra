/**
 * Google Analytics 4 (GA4) Utility & Tracker for Success Mantra
 * Supports automatic SPA route change tracking, custom conversions, and e-commerce events.
 */

import { SITE_CONFIG } from '../config/seoConfig';

let isInitialized = false;

/**
 * Initialize Google Analytics 4
 * @param {string} [measurementId] - GA4 Measurement ID (e.g., 'G-XXXXXXXXXX')
 */
export function initGA(measurementId = SITE_CONFIG.analytics?.gaMeasurementId) {
  if (typeof window === 'undefined') return;
  if (!measurementId || measurementId === 'G-XXXXXXXXXX' || isInitialized) return;

  // Insert Google Analytics script asynchronously
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false // Managed manually via trackPageView on route changes
  });

  isInitialized = true;
}

/**
 * Track SPA Pageviews on Route Change
 * @param {string} path - URL path (e.g., '/class-12-commerce')
 * @param {string} [title] - Page title
 */
export function trackPageView(path, title = document.title) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const measurementId = SITE_CONFIG.analytics?.gaMeasurementId;
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') return;

  window.gtag('event', 'page_view', {
    page_path: path || window.location.pathname,
    page_location: window.location.href,
    page_title: title || document.title,
    send_to: measurementId
  });
}

/**
 * Track Custom Event (e.g., Lead form, video play, demo test, book purchase)
 * @param {string} eventName - GA4 Event Name (e.g., 'generate_lead', 'begin_checkout', 'purchase')
 * @param {Object} [params] - Custom parameters
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, {
    ...params,
    event_category: params.category || 'engagement',
    event_label: params.label,
    value: params.value
  });
}
