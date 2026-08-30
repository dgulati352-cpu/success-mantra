import React from 'react';
import { Eye, Keyboard, Volume2, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AccessibilityStatement() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Inclusive Digital Education</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Accessibility Statement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Our ongoing commitment to making high-quality Commerce education accessible to every student
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Our Commitment
            </h2>
            <p>
              At <strong>Success Mantra</strong>, we believe every student deserves seamless access to board and professional commerce coaching. We actively build and refine our web platform, video player, and test taking engine with modern web accessibility principles in mind.
            </p>
          </section>

          {/* Section 2: Implemented Features */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Key Accessibility Features in Success Mantra
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-600" /> Full Keyboard Navigation
                </div>
                <p className="text-xs text-slate-500">All menus, video controls, test question navigation, and buttons are operable via Tab and keyboard shortcuts.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" /> High Contrast & Legibility
                </div>
                <p className="text-xs text-slate-500">Typography uses high contrast ratios (Inter and Outfit fonts) to ensure readability for low-vision learners.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Audio & Video Speed Controls
                </div>
                <p className="text-xs text-slate-500">Video player supports variable playback speeds (0.75x to 2x) and clear audio streaming for auditory accessibility.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Screen Reader Labels
                </div>
                <p className="text-xs text-slate-500">Semantic HTML5 tags and descriptive ARIA labels for non-visual assistive technology.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Feedback */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Accessibility Feedback & Assistance</h2>
            <p className="text-xs text-slate-600">
              If you experience any accessibility barriers while using our platform, please reach out so our technical team can assist you:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
              <div><strong>Email:</strong> <a href="mailto:camanishkalra@gmail.com" className="text-indigo-600 font-semibold">camanishkalra@gmail.com</a> (Subject: <em>Accessibility Feedback</em>)</div>
              <div><strong>Helpline:</strong> <a href="tel:+918755910352" className="text-indigo-600 font-semibold">+91 87559 10352</a></div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
