import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FileText, Download, Search, BookOpen, Lock, ShoppingCart, CheckCircle2, Sparkles } from 'lucide-react';

export function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/materials')
      .then(res => {
        if (res.success) setMaterials(res.materials);
      })
      .catch(err => console.error('Fetch materials error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = materials.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.course_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Study Materials & Handbooks</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Downloadable formula sheets, NCERT summary booklets, and CBSE past 10-year question banks.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search notes, formulas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading study repository...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No study materials found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(mat => {
            const hasAccess = Boolean(mat.can_download || mat.is_enrolled);

            return (
              <div
                key={mat.id}
                className={`p-6 rounded-3xl bg-white border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-sm ${
                  hasAccess
                    ? 'border-slate-200 hover:shadow-lg hover:border-indigo-200'
                    : 'border-slate-200/80 bg-slate-50/50'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase">
                      {mat.file_type || 'PDF'} • {mat.file_size || '3.5 MB'}
                    </span>

                    {hasAccess ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enrolled & Unlocked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                        <Lock className="w-3 h-3 text-amber-600" /> Course Purchase Required
                      </span>
                    )}

                    <span className="text-xs text-slate-500 font-medium truncate max-w-xs">{mat.course_title}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{mat.title}</h3>
                  {mat.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{mat.description}</p>
                  )}
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {hasAccess ? (
                    <a
                      href={mat.file_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  ) : (
                    <Link
                      to={`/courses/${mat.course_slug || mat.course_id}`}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" /> Buy Course to Unlock {mat.course_price ? `(₹${mat.course_price})` : ''}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
