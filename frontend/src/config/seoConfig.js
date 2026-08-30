/**
 * Centralized SEO & Entity Configuration for Success Mantra
 * Single source of truth for NAP (Name, Address, Phone), Canonical domain,
 * Meta defaults, and Schema.org generators.
 */

export const SITE_CONFIG = {
  domain: 'https://www.camanishkalra.com',
  siteName: 'Success Mantra',
  legalName: 'Success Mantra',
  alternateNames: [
    'Success Mantra Class 12 Coaching',
    'Success Mantra Class 11 Coaching',
    'Success Mantra Commerce Coaching Saharanpur'
  ],
  logoUrl: 'https://www.camanishkalra.com/logo.png',
  defaultOgImage: 'https://www.camanishkalra.com/logo.png',
  phone: '+91 87559 10352',
  phoneClean: '+918755910352',
  email: 'camanishkalra@gmail.com',
  address: {
    streetAddress: 'H.No. Kothi D-Type 52, Numaish Camp',
    addressLocality: 'Saharanpur',
    addressRegion: 'Uttar Pradesh',
    postalCode: '247001',
    addressCountry: 'IN',
    fullFormatted: 'H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, Uttar Pradesh 247001, India'
  },
  geo: {
    latitude: 29.9679,
    longitude: 77.5452
  },
  areaServed: [
    'Saharanpur',
    'Uttar Pradesh',
    'Delhi NCR',
    'India'
  ],
  socialLinks: {
    website: 'https://www.camanishkalra.com',
    instagram: 'https://www.instagram.com/successmantra_camanishkalra',
    telegram: 'https://t.me/successmantra'
  },
  googleReputation: {
    ratingValue: 5.0,
    reviewCount: 45,
    bestRating: 5,
    worstRating: 1
  }
};

/**
 * Generate Organization & LocalBusiness JSON-LD Schema
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['EducationalOrganization', 'LocalBusiness'],
        '@id': `${SITE_CONFIG.domain}/#organization`,
        name: SITE_CONFIG.siteName,
        legalName: SITE_CONFIG.legalName,
        url: SITE_CONFIG.domain,
        logo: {
          '@type': 'ImageObject',
          url: SITE_CONFIG.logoUrl
        },
        image: SITE_CONFIG.logoUrl,
        description: 'Premier Commerce Education Institute & Publications for Class 11, Class 12, CBSE Board Exams, CUET UG & CA Foundation in Saharanpur, Uttar Pradesh.',
        telephone: SITE_CONFIG.phone,
        email: SITE_CONFIG.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE_CONFIG.address.streetAddress,
          addressLocality: SITE_CONFIG.address.addressLocality,
          addressRegion: SITE_CONFIG.address.addressRegion,
          postalCode: SITE_CONFIG.address.postalCode,
          addressCountry: SITE_CONFIG.address.addressCountry
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: SITE_CONFIG.geo.latitude,
          longitude: SITE_CONFIG.geo.longitude
        },
        areaServed: SITE_CONFIG.areaServed.map(area => ({
          '@type': 'AdministrativeArea',
          name: area
        })),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: SITE_CONFIG.googleReputation.ratingValue,
          reviewCount: SITE_CONFIG.googleReputation.reviewCount,
          bestRating: SITE_CONFIG.googleReputation.bestRating,
          worstRating: SITE_CONFIG.googleReputation.worstRating
        },
        sameAs: Object.values(SITE_CONFIG.socialLinks)
      }
    ]
  };
}

/**
 * Generate Product JSON-LD Schema for Books
 */
export function getBookProductSchema({
  name,
  description,
  image,
  sku,
  price,
  originalPrice,
  url,
  inStock = true
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image || SITE_CONFIG.defaultOgImage,
    sku: sku || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    brand: {
      '@type': 'Brand',
      name: SITE_CONFIG.siteName
    },
    offers: {
      '@type': 'Offer',
      url: url || SITE_CONFIG.domain,
      priceCurrency: 'INR',
      price: price ? String(price) : '499',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  };
}

/**
 * Generate BreadcrumbList JSON-LD Schema
 */
export function getBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.domain}${item.url}`
    }))
  };
}

/**
 * Generate FAQPage JSON-LD Schema
 */
export function getFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q || faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a || faq.answer
      }
    }))
  };
}
