import React from 'react';
import { Truck, Package, Clock, MapPin, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ShippingPolicy() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Printed Books & Study Material Delivery</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Shipping & Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Last Updated: August 2026 • Official dispatch and courier delivery standards for Success Mantra Publications
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Order Processing & Dispatch Timeline
            </h2>
            <p>
              When you purchase physical printed textbooks, question banks, or study kits from our <Link to="/store" className="text-indigo-600 font-semibold underline">Bookstore</Link>, our warehouse team packages your order with moisture-resistant protective bubble wrap.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Dispatch Window
                </div>
                <p className="text-xs text-slate-500">Orders are packed and dispatched within <strong>24 to 48 business hours</strong> of successful payment.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Instant Digital Access
                </div>
                <p className="text-xs text-slate-500">While your physical book is in transit, your digital companion PDF is unlocked immediately in your student portal.</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Estimated Delivery Times Across India
            </h2>
            <p>We partner with premier express courier networks (Delhivery, BlueDart, DTDC, and India Post Speed Post):</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Region / Location</th>
                    <th className="py-2.5 px-4">Estimated Transit Time</th>
                    <th className="py-2.5 px-4">Delivery Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">Delhi-NCR, Uttar Pradesh, Punjab, Haryana</td>
                    <td className="py-2.5 px-4">2 – 3 Business Days</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Express Surface / Air</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">Metro Cities (Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad)</td>
                    <td className="py-2.5 px-4">3 – 5 Business Days</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Express Courier</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">Rest of India & Tier 2/3 Cities</td>
                    <td className="py-2.5 px-4">4 – 7 Business Days</td>
                    <td className="py-2.5 px-4 text-slate-500">Standard Surface Courier</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">North-East, J&K, Remote Pin Codes</td>
                    <td className="py-2.5 px-4">6 – 9 Business Days</td>
                    <td className="py-2.5 px-4 text-slate-500">Speed Post (India Post)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              Live Shipment Tracking
            </h2>
            <p>
              Once your parcel is handed over to the courier partner, you will receive an automated WhatsApp notification and email with your <strong>AWB Tracking Number</strong> and direct tracking link. You can also view live tracking updates directly in your <Link to="/student/books" className="text-indigo-600 font-semibold underline">Student Books Dashboard</Link>.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              Damaged, Lost, or Delayed Parcels
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Transit Protection Guarantee:
              </div>
              <p>
                In the rare event that a parcel is confirmed lost in transit by the courier, or arrives damaged, Success Mantra will dispatch a replacement package immediately at zero extra cost to the student.
              </p>
            </div>
          </section>

          {/* Section 5: Support */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Shipping Support & Dispatch Desk</h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
              <div><strong>Dispatch Hub:</strong> 5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur, UP 247001</div>
              <div><strong>Helpline:</strong> <a href="tel:+918755910352" className="text-indigo-600 font-semibold">+91 87559 10352</a></div>
              <div><strong>Email:</strong> <a href="mailto:camanishkalra@gmail.com" className="text-indigo-600 font-semibold">camanishkalra@gmail.com</a></div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
