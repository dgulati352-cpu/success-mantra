"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  X,
  Sparkles,
  CheckCircle2,
  Lock,
  ShieldCheck,
  QrCode,
  CreditCard,
  Building2,
  Crown,
  Zap,
  PlayCircle,
  Video,
  MessageSquare,
  Award,
} from "lucide-react";

interface MembershipCheckoutModalProps {
  plan: "pro" | "ultra";
  billingCycle: "monthly" | "annual";
  onClose: () => void;
}

export const MembershipCheckoutModal: React.FC<MembershipCheckoutModalProps> = ({
  plan,
  billingCycle,
  onClose,
}) => {
  const { activateMembership } = useCart();
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("student@upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const isPro = plan === "pro";
  const price = isPro
    ? billingCycle === "annual"
      ? 4999
      : 999
    : billingCycle === "annual"
    ? 7999
    : 1499;

  const originalPrice = isPro
    ? billingCycle === "annual"
      ? 11988
      : 1499
    : billingCycle === "annual"
    ? 17988
    : 2299;

  const planTitle = isPro ? "Success Mantra VIP Pro Membership" : "Success Mantra Ultra Infinity Pass";

  const handlePayAndActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      activateMembership(plan);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950/40 text-slate-200 hover:text-white hover:bg-slate-950/60 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Crown className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider rounded-md border border-amber-400/40">
                  {billingCycle === "annual" ? "Annual Pass • Save 60%" : "Monthly Plan"}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5">{planTitle}</h3>
            </div>
          </div>
        </div>

        {/* Success View */}
        {success ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-full border border-amber-500/30 inline-flex items-center space-x-1">
                <Crown className="w-3.5 h-3.5 fill-amber-300" />
                <span>VIP Membership Activated!</span>
              </span>
              <h3 className="text-2xl font-black text-white">Welcome to {planTitle} 🎉</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All Live Classes, 24x7 Doubt Clearance, HD Video Vault & NTA CBT Mock Series are now 100% UNLOCKED!
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Order ID:</span>
                <span className="text-emerald-400 font-bold">MEMB-{Math.floor(1000000 + Math.random() * 9000000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="text-white font-bold">₹{price} ({billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Live Classes Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-emerald-400" /> All Unlocked
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition"
            >
              Start Attending Live Classes Now
            </button>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handlePayAndActivate} className="p-6 space-y-5">
            {/* Price Summary Banner */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Subscription Total</p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-2xl font-black text-white">₹{price}</span>
                  <span className="text-xs text-slate-500 line-through">₹{originalPrice}</span>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">Billed {billingCycle}</span>
                <span className="text-xs font-bold text-amber-400">Instant Activation</span>
              </div>
            </div>

            {/* Quick Unlocks Highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center space-x-2">
                <Video className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Daily Live Interactive Classes</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">24x7 Instant Doubt Solver</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center space-x-2">
                <PlayCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Full 200+ Video Vault</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">NTA CBT Mock Test Engine</span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("upi")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    method === "upi"
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-md"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span>UPI / GPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("card")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    method === "card"
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-md"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Debit / Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("netbanking")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    method === "netbanking"
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-md"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>NetBanking</span>
                </button>
              </div>
            </div>

            {/* Dynamic Inputs */}
            {method === "upi" && (
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">Enter UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 9876543210@paytm or student@okicici"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                  <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">Google Pay</span>
                  <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">PhonePe</span>
                  <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">Paytm</span>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="4532 •••• •••• 8821"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">CVV Code</label>
                    <input
                      type="password"
                      maxLength={3}
                      required
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "netbanking" && (
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <label className="block font-semibold text-slate-300">Select Bank</label>
                <select className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option>State Bank of India (SBI)</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Kotak Mahindra Bank</option>
                </select>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {processing ? (
                <span>Processing VIP Membership...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹{price} & Unlock VIP Membership</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Instant Unlock • 100% Refund Guarantee • Bank Encrypted</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
