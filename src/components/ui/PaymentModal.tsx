"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { X, CreditCard, QrCode, Building2, CheckCircle2, ShieldCheck, Lock } from "lucide-react";

interface PaymentModalProps {
  amount: number;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ amount, onClose }) => {
  const { cart, clearCart, setIsCartOpen, markBookPurchased, markCoursePurchased } = useCart();
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("student@upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      const bookIds = cart.map((i) => i.book.id);
      markBookPurchased(bookIds);
      markCoursePurchased(["accountancy-101", "business-201", "economics-301", "entrepreneurship-401", "physics-101"]);
      clearCart();
    }, 1500);
  };

  const handleDone = () => {
    setSuccess(false);
    onClose();
    setIsCartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <div>
              <h3 className="font-bold text-sm">Success Mantra Checkout Gateway</h3>
              <p className="text-[10px] text-blue-200">Powered by Razorpay & PhonePe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 mt-1">Transaction ID: TXN-{Math.floor(10000000 + Math.random() * 90000000)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <p className="text-slate-600"><strong>Amount Paid:</strong> ₹{amount}</p>
              <p className="text-slate-600"><strong>Status:</strong> Dispatched within 24 hours</p>
              <p className="text-slate-600"><strong>Confirmation:</strong> Sent to email & SMS</p>
            </div>
            <button
              onClick={handleDone}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl"
            >
              Back to Store
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayNow} className="p-5 space-y-4">
            {/* Amount display */}
            <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Total Payable Amount</span>
              <span className="text-xl font-black text-blue-700">₹{amount}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod("upi")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  method === "upi"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI / GPay</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  method === "card"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("netbanking")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  method === "netbanking"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Form Fields according to selected method */}
            {method === "upi" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobile@paytm or user@okicici"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex gap-2 text-[10px] text-slate-500 pt-1">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">PhonePe</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">Google Pay</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">Paytm</span>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="4532 •••• •••• 8821"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      required
                      placeholder="•••"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "netbanking" && (
              <div className="space-y-2 text-xs">
                <label className="block font-semibold text-slate-700">Select Bank</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option>State Bank of India (SBI)</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{processing ? "Processing Payment..." : `Pay ₹${amount} Now`}</span>
            </button>

            <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>PCI-DSS Compliant • Bank Grade Security</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
