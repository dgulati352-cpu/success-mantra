import React from 'react';
import { Shield, Lock, Eye, Server, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Digital Personal Data Protection (DPDP) Act Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Last Updated: August 2026 • Official Privacy Practices of Success Mantra (CA Manish Kalra's Commerce Academy)
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Introduction & Scope
            </h2>
            <p>
              Welcome to <strong>Success Mantra</strong> (operating at <a href="https://www.camanishkalra.com" className="text-indigo-600 font-semibold underline">camanishkalra.com</a>), founded and directed by <strong>CA Manish Kalra</strong>. We provide commerce coaching, live interactive classrooms, recorded video lectures, computerized mock test series, and printed course books for Class 11, Class 12, CUET, and CA Foundation aspirants.
            </p>
            <p>
              We are committed to protecting your personal data and upholding high standards of transparency, confidentiality, and security in accordance with the <strong>Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act, 2023 (DPDP)</strong> of India.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Information We Collect
            </h2>
            <p>We collect only the information necessary to provide our educational services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Student Registration Details:</strong> Full Name, Email Address, Mobile / WhatsApp Number, Password (cryptographically hashed using Bcrypt), School Name, Target Class (e.g. Class 12 Commerce), and City.</li>
              <li><strong>Academic Progress & Test Data:</strong> Mock exam scores, question response selections, attendance timestamps in live classrooms, and assignment submissions.</li>
              <li><strong>Shipping Address:</strong> Required solely for the delivery of physical printed books, test modules, and study kits.</li>
              <li><strong>Payment Information:</strong> Handled securely through <strong>Razorpay</strong>. We never store credit/debit card numbers, CVV codes, or net banking passwords on our servers.</li>
              <li><strong>Technical Logs:</strong> Device type, browser user-agent, IP address for security audits, and session tokens.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              How We Use Your Data
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Academic Delivery
                </div>
                <p className="text-xs text-slate-500">Provisioning access to enrolled live batches, video archives, and test analysis.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Notifications & Alerts
                </div>
                <p className="text-xs text-slate-500">Sending class schedule alerts, exam reminders, and certificates via Email/WhatsApp.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Order Fulfillment
                </div>
                <p className="text-xs text-slate-500">Dispatching physical printed books and study kits via registered courier.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Security & Anti-Piracy
                </div>
                <p className="text-xs text-slate-500">Preventing unauthorized concurrent account sharing and content scraping.</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              Third-Party Processors
            </h2>
            <p>
              We do not sell, rent, or trade student personal information to any advertisers or third parties. We share data strictly with trusted infrastructure providers required to operate the platform:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Razorpay Software Pvt. Ltd.:</strong> Payment gateway for processing INR transactions securely.</li>
              <li><strong>Google Firebase & Cloud Firestore:</strong> Encrypted cloud database and Google OAuth authentication.</li>
              <li><strong>Google Gmail SMTP:</strong> Transactional communications and password recovery emails.</li>
              <li><strong>Vercel Inc.:</strong> High-speed cloud hosting and edge network delivery.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">5</span>
              Student Rights & Account Deletion
            </h2>
            <p>
              Students have the right to review, update, or request the deletion of their personal data at any time. You can initiate self-service account deletion directly from your <Link to="/student/profile" className="text-indigo-600 font-semibold underline">Student Profile</Link> or by emailing our Data Privacy Officer.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">6</span>
              Contact & Grievance Redressal
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900">Success Mantra Grievance Redressal Officer:</div>
              <div className="text-slate-600"><strong>Director:</strong> CA Manish Kalra</div>
              <div className="text-slate-600"><strong>Email:</strong> <a href="mailto:camanishkalra@gmail.com" className="text-indigo-600 font-semibold">camanishkalra@gmail.com</a></div>
              <div className="text-slate-600"><strong>Phone / Helpline:</strong> <a href="tel:+918755910352" className="text-indigo-600 font-semibold">+91 87559 10352</a></div>
              <div className="text-slate-600"><strong>Academy Address:</strong> 5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur, Uttar Pradesh 247001, India</div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
