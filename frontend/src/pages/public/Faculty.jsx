import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { Users, Award, BookOpen, Star, Sparkles } from 'lucide-react';

export function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/public/faculty')
      .then(res => {
        if (res.success) setFaculty(res.faculty);
      })
      .catch(err => console.error('Fetch faculty error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold">
          <Award className="w-3.5 h-3.5" />
          <span>Academic Mentors</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Learn from India’s Renowned Educators
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Chartered Accountants, Ph.D. scholars, and ex-board examiners with proven track records of producing AIR 1 toppers.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading faculty roster...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {faculty.map(f => (
            <div
              key={f.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition p-8 space-y-6 flex flex-col justify-between text-center"
            >
              <div className="space-y-4">
                <img
                  src={f.avatar_url}
                  alt={f.name}
                  className="w-28 h-28 rounded-full mx-auto object-cover border-4 border-indigo-100 shadow-md"
                />

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">{f.name}</h3>
                  <div className="text-xs font-bold text-indigo-600">{f.qualification}</div>
                  <div className="text-xs text-slate-500 font-medium">{f.specialization} • {f.experience_years}+ Years Experience</div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed italic">{f.bio}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-700">{f.total_students ? `${f.total_students.toLocaleString()}+ Mentored` : '5,000+ Mentored'}</span>
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /> 4.9 / 5.0
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
