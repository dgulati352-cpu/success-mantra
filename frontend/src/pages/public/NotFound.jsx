import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, BookOpen, Search, ArrowLeft, Video, Award } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl">
        
        {/* Visual Badge */}
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-sm">
          <Compass className="w-10 h-10 animate-pulse text-indigo-600" />
        </div>

        <div className="space-y-2">
          <div className="font-mono font-black text-4xl sm:text-6xl text-indigo-600">404</div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            The study material, batch, or destination you are looking for might have been moved or doesn't exist.
          </p>
        </div>

        {/* Quick Nav Suggestions */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Popular Destinations:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/courses"
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-semibold flex items-center gap-2 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Browse Courses
            </Link>
            <Link
              to="/live-classes"
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-semibold flex items-center gap-2 transition"
            >
              <Video className="w-3.5 h-3.5 text-rose-600" /> Live Classes
            </Link>
            <Link
              to="/store"
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-semibold flex items-center gap-2 transition"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" /> Books & Notes
            </Link>
            <Link
              to="/verify-certificate"
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-semibold flex items-center gap-2 transition"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" /> Verify Certificate
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Return to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
