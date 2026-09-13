import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';
import { SITE_CONFIG } from '../../config/seoConfig';

/**
 * Declarative SEO Head component
 */
export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogImage = SITE_CONFIG.defaultOgImage,
  ogType = 'website',
  noindex = false,
  schema = null
}) {
  useSEO({
    title,
    description,
    keywords,
    canonical,
    ogImage,
    ogType,
    noindex,
    schema
  });

  return null;
}

/**
 * Reusable visual breadcrumbs with schema-friendly markup
 */
export function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="py-3 px-4 sm:px-6 bg-slate-50/80 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto flex items-center flex-wrap gap-2 text-xs sm:text-sm text-slate-600">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 hover:text-indigo-600 font-medium transition-colors text-slate-500"
        >
          <HomeIcon className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast || !item.path ? (
                <span className="font-semibold text-indigo-950 truncate max-w-[220px] sm:max-w-xs" aria-current="page">
                  {item.label || item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-indigo-600 font-medium transition-colors truncate max-w-[180px] sm:max-w-xs"
                >
                  {item.label || item.name}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
