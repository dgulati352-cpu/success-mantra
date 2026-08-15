"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import { PaymentModal } from "./PaymentModal";

export const CartDrawer: React.FC = () => {
  const { isCartOpen, setIsCartOpen, cart, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  if (!isCartOpen) return null;

  const shippingCost = subtotal > 500 || cart.length === 0 ? 0 : 40;
  const grandTotal = subtotal + shippingCost;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity">
        <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
            {/* Header */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Your Book Cart ({totalItems})</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Banner */}
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>🎉 Free delivery on orders over ₹500!</span>
              <span className="font-bold text-emerald-900">
                {subtotal >= 500 ? "Eligible" : `Add ₹${500 - subtotal} more`}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-slate-600 font-medium">Your cart is currently empty</p>
                  <p className="text-xs text-slate-400">Explore our JEE, NEET & CBSE books collection.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.book.id}
                    className="flex space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 items-center"
                  >
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="w-16 h-20 object-cover rounded-lg shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded">
                          {item.book.targetExam}
                        </span>
                        <span className="text-[11px] text-slate-500">{item.book.classLevel}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.book.title}</h4>
                      <p className="text-[11px] text-slate-500 mb-2">By {item.book.author}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-md px-1 py-0.5">
                          <button
                            onClick={() => updateQuantity(item.book.id, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:text-blue-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                            className="p-1 text-slate-600 hover:text-blue-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900">₹{item.book.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.book.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout CTA */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="font-semibold text-emerald-600">
                      {shippingCost === 0 ? "FREE" : `₹${shippingCost}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Amount</span>
                    <span className="text-blue-600 text-base">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secured by Razorpay / PhonePe 256-bit Encryption</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentModalOpen && (
        <PaymentModal
          amount={grandTotal}
          onClose={() => setPaymentModalOpen(false)}
        />
      )}
    </>
  );
};
