import React from 'react';
import { Wrench, Phone, RefreshCw, Clock, Sparkles } from 'lucide-react';

export function Maintenance() {
  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
          <Wrench className="w-8 h-8 text-amber-600 animate-spin" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Scheduled Upgrade Underway</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            System Maintenance
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            We are currently performing routine server optimizations to enhance your live classroom streaming experience. We will be back online shortly.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Check If Online
          </button>

          <a
            href="https://wa.me/918755910352?text=Hello%20Success%20Mantra,%20inquiry%20during%20maintenance"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> Urgent Inquiry? WhatsApp Academy Helpline
          </a>
        </div>

      </div>
    </div>
  );
}
