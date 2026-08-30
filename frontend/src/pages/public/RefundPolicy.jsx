import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Phone, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RefundPolicy() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fair & Transparent Purchase Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Last Updated: August 2026 • Clear guidelines on course cancellations, fee refunds, and bookstore returns
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1: Digital Courses & Test Series */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Online Courses, Live Batches & Test Series
            </h2>
            <p>
              We strive to deliver high-quality Commerce education. To give you complete peace of mind, we provide a <strong>7-Day Course Evaluation Window</strong>:
            </p>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 7-Day Refund Conditions:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                <li>Refund request must be submitted within <strong>7 calendar days</strong> of initial course purchase.</li>
                <li>The student must not have consumed more than <strong>20% of the total course video lectures</strong> or downloaded proprietary encrypted offline modules.</li>
                <li>The student must not have attempted more than <strong>2 full-length mock examinations</strong>.</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Physical Books & Study Modules */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Printed Books & Study Material (Bookstore)
            </h2>
            <p>
              Physical books purchased from the <Link to="/store" className="text-indigo-600 font-semibold underline">Success Mantra Bookstore</Link> are eligible for a replacement or return under the following terms:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
              <li><strong>Damaged / Defective Books:</strong> If your package arrives damaged, with missing pages, or misprinted binding, notify us within <strong>48 hours</strong> of delivery with unboxing photos/video for a 100% free doorstep replacement.</li>
              <li><strong>Incorrect Item Received:</strong> If you received a different subject or class module than ordered, we will arrange a return pickup and dispatch the correct module immediately at zero additional shipping cost.</li>
              <li><strong>Change of Mind:</strong> Once dispatched and delivered in intact condition, physical books are non-refundable due to academic publication copyright safeguards.</li>
            </ul>
          </section>

          {/* Section 3: VIP Membership Scholar Passes */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              Scholar Passes & VIP Memberships
            </h2>
            <p>
              VIP Memberships provide instant, unrestricted access to the entire video vault, all live batch rooms, and premium test engines. Because full digital access is unlocked immediately, monthly membership passes are non-refundable once activated. For annual memberships, pro-rated cancellations may be requested within the first 14 days by contacting administration.
            </p>
          </section>

          {/* Section 4: How to Request a Refund */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              Refund Processing Timeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> 1. Request Review
                </div>
                <p className="text-[11px] text-slate-500">Our support desk verifies course analytics and order records within 24–48 hours.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> 2. Approval & Bank Initiation
                </div>
                <p className="text-[11px] text-slate-500">Refund is initiated directly to your original payment method via Razorpay.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> 3. Account Credit
                </div>
                <p className="text-[11px] text-slate-500">Amount reflects in your bank account / UPI within 5–7 business days.</p>
              </div>
            </div>
          </section>

          {/* Section 5: Contact */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">How to Submit a Refund Request</h2>
            <p className="text-xs text-slate-600">
              Submit your order number, registered email, and reason for refund to:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
              <div><strong>Email:</strong> <a href="mailto:camanishkalra@gmail.com" className="text-indigo-600 font-semibold">camanishkalra@gmail.com</a> (Subject: <em>Refund Request - [Order Number]</em>)</div>
              <div><strong>Helpline:</strong> <a href="tel:+918755910352" className="text-indigo-600 font-semibold">+91 87559 10352</a></div>
              <div><strong>Student Portal:</strong> Submit directly via <Link to="/student/support" className="text-indigo-600 font-semibold underline">Student Support Desk</Link>.</div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
