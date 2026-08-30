import React from 'react';
import { Award, ShieldCheck, CheckCircle2, Sparkles, QrCode } from 'lucide-react';

export function CertificateView({ certificate, isPrint = false }) {
  if (!certificate) return null;

  const {
    certificate_code = 'SM-2026-000123',
    student_name = 'Laura Bennett',
    course_title = 'Class 12 Commerce Board Master Blueprint',
    citation_text = 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
    issue_date = '28 January 2026',
    director_name = 'C.A. Manish Kalra',
    director_title = 'Director',
    grade = 'A+ (Distinction 98%+)'
  } = certificate;

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto aspect-[1.414/1] bg-[#0c0d12] text-white rounded-3xl overflow-hidden shadow-2xl border-4 border-[#c5a059]/40 select-none ${
        isPrint ? 'shadow-none border-2' : ''
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(26, 28, 38, 0.9) 0%, rgba(12, 13, 18, 1) 100%),
          repeating-radial-gradient(circle at 0 0, transparent 0, rgba(197, 160, 89, 0.03) 10px, transparent 20px)
        `
      }}
    >
      {/* Golden Wave Corners (Top-Left & Bottom-Right) */}
      <div className="absolute top-0 left-0 w-36 sm:w-56 h-36 sm:h-56 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 200 200" className="w-full h-full text-[#d4af37] opacity-90 fill-current">
          <path d="M0,0 L120,0 C100,50 80,80 30,110 C0,130 0,160 0,200 Z" fill="url(#goldGradient1)" />
          <path d="M0,0 L70,0 C60,40 50,60 15,85 C0,100 0,130 0,160 Z" fill="url(#goldGradient2)" opacity="0.7" />
          <defs>
            <linearGradient id="goldGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7e08b" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#aa7c11" />
            </linearGradient>
            <linearGradient id="goldGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff2a8" />
              <stop offset="100%" stopColor="#8a6108" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute bottom-0 right-0 w-36 sm:w-56 h-36 sm:h-56 pointer-events-none overflow-hidden rotate-180">
        <svg viewBox="0 0 200 200" className="w-full h-full text-[#d4af37] opacity-90 fill-current">
          <path d="M0,0 L120,0 C100,50 80,80 30,110 C0,130 0,160 0,200 Z" fill="url(#goldGradient3)" />
          <path d="M0,0 L70,0 C60,40 50,60 15,85 C0,100 0,130 0,160 Z" fill="url(#goldGradient4)" opacity="0.7" />
          <defs>
            <linearGradient id="goldGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7e08b" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#aa7c11" />
            </linearGradient>
            <linearGradient id="goldGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff2a8" />
              <stop offset="100%" stopColor="#8a6108" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Outer Golden Border Inset Line */}
      <div className="absolute inset-3 sm:inset-5 border border-[#d4af37]/30 rounded-2xl pointer-events-none"></div>

      {/* Main Certificate Content */}
      <div className="relative z-10 h-full flex flex-col justify-between items-center text-center p-6 sm:p-10 md:p-12">
        
        {/* Top Header: Logo */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b]" />
            <span className="font-heading font-black tracking-widest text-xs sm:text-sm uppercase text-slate-200">
              Success Mantra
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-[#c5a059] uppercase tracking-[0.25em]">
            CA Manish Kalra's Commerce Academy
          </p>
        </div>

        {/* Certificate Title in Golden Ribbon */}
        <div className="my-2 sm:my-3">
          <div className="relative inline-block px-8 sm:px-14 py-2 sm:py-3.5 bg-gradient-to-r from-[#aa7c11] via-[#f7e08b] to-[#aa7c11] text-[#0c0d12] rounded-lg shadow-xl shadow-amber-950/40">
            {/* Ribbon notch triangles */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[18px] sm:border-y-[24px] border-y-transparent border-r-[14px] border-r-[#aa7c11]"></div>
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[18px] sm:border-y-[24px] border-y-transparent border-l-[14px] border-l-[#aa7c11]"></div>
            
            <h1 className="font-serif text-lg sm:text-2xl md:text-3xl font-black tracking-[0.15em] uppercase text-black">
              CERTIFICATE
            </h1>
          </div>
          <div className="font-sans font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.3em] uppercase text-[#d4af37] mt-1.5">
            OF COMPLETION
          </div>
        </div>

        {/* Presented To Badge */}
        <div className="space-y-1 sm:space-y-2">
          <div className="inline-block px-4 sm:px-6 py-0.5 rounded-full border border-purple-500/80 bg-purple-950/30 text-purple-200 font-bold text-[9px] sm:text-[11px] uppercase tracking-wider">
            Successfully Presented To
          </div>

          {/* Student Name */}
          <div className="pt-1">
            <h2
              className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#fef08a] via-[#fde047] to-[#d4af37] tracking-wide"
              style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                textShadow: '0 2px 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              {student_name}
            </h2>
            <div className="w-48 sm:w-80 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-2 opacity-60"></div>
          </div>
        </div>

        {/* Citation / Course Description Text */}
        <div className="max-w-xl mx-auto space-y-1.5 px-4">
          <p className="text-[10px] sm:text-xs md:text-sm text-slate-300 font-light leading-relaxed">
            {citation_text}
          </p>
          <p className="text-[10px] sm:text-xs font-semibold text-[#f59e0b]">
            Course: <strong>{course_title}</strong> {grade ? `• Grade: ${grade}` : ''}
          </p>
        </div>

        {/* Date & Director Seal Footer */}
        <div className="w-full grid grid-cols-3 items-end pt-2 sm:pt-4 border-t border-[#c5a059]/20 text-[10px] sm:text-xs">
          
          {/* Left: Issue Date */}
          <div className="text-left space-y-1 pl-2">
            <span className="text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-wider block">Date of Issue</span>
            <span className="font-bold text-slate-200 block text-[11px] sm:text-xs">{issue_date}</span>
            <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 block">ID: {certificate_code}</span>
          </div>

          {/* Center: Golden Medal / Seal */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#8a6108] via-[#f7e08b] to-[#d4af37] flex items-center justify-center shadow-lg shadow-amber-950/60 p-0.5">
              <div className="w-full h-full rounded-full border-2 border-dashed border-[#8a6108] flex items-center justify-center bg-gradient-to-br from-[#d4af37] to-[#aa7c11]">
                <Award className="w-5 h-5 sm:w-7 sm:h-7 text-black drop-shadow" />
              </div>
              {/* Ribbon tails below seal */}
              <div className="absolute -bottom-2 -left-1 w-3 sm:w-4 h-4 sm:h-5 bg-[#aa7c11] -rotate-12 -z-10 clip-ribbon"></div>
              <div className="absolute -bottom-2 -right-1 w-3 sm:w-4 h-4 sm:h-5 bg-[#d4af37] rotate-12 -z-10 clip-ribbon"></div>
            </div>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#d4af37] mt-1.5">
              Official Seal
            </span>
          </div>

          {/* Right: Director Signature */}
          <div className="text-right space-y-1 pr-2">
            <span className="text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-wider block">{director_title}</span>
            <div className="font-serif italic text-xs sm:text-sm font-bold text-amber-200">
              {director_name}
            </div>
            <span className="text-[8px] sm:text-[9px] text-[#c5a059] block">
              Senior Chartered Accountant
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
