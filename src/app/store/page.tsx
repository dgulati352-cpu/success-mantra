"use client";

import React, { useState } from "react";
import { useCart, BookItem } from "@/context/CartContext";
import { useClass } from "@/context/ClassContext";
import {
  ShoppingBag,
  Star,
  Plus,
  Check,
  Search,
  Filter,
  Sparkles,
  Truck,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

const storeBooks: BookItem[] = [
  {
    id: "b1",
    title: "Concepts of Physics (Vol 1 & 2 Combo)",
    author: "H.C. Verma",
    targetExam: "JEE",
    classLevel: "Both",
    price: 899,
    originalPrice: 1200,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "b2",
    title: "Errorless Chemistry 2025 (Vol 1 & 2)",
    author: "Universal Book Team",
    targetExam: "NEET",
    classLevel: "Class 12",
    price: 1150,
    originalPrice: 1599,
    coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "b3",
    title: "Mathematics for Class 12 (RD Sharma)",
    author: "Dr. R.D. Sharma",
    targetExam: "CBSE",
    classLevel: "Class 12",
    price: 675,
    originalPrice: 850,
    coverImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "b4",
    title: "NCERT Fingertips Physics Class 11",
    author: "MTG Editorial Board",
    targetExam: "NEET",
    classLevel: "Class 11",
    price: 495,
    originalPrice: 650,
    coverImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "b5",
    title: "JEE Main 22 Years Solved Papers (2002-2024)",
    author: "Disha Experts",
    targetExam: "JEE",
    classLevel: "Both",
    price: 580,
    originalPrice: 799,
    coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "b6",
    title: "Organic Chemistry for JEE Advanced",
    author: "M.S. Chouhan",
    targetExam: "JEE",
    classLevel: "Class 12",
    price: 520,
    originalPrice: 699,
    coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&auto=format&fit=crop&q=80",
    rating: 4.8,
    inStock: true,
  },
];

export default function BookStorePage() {
  const { addToCart, cart } = useCart();
  const { selectedClass } = useClass();
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredBooks = storeBooks.filter((b) => {
    const matchesExam = selectedExamFilter === "All" || b.targetExam === selectedExamFilter;
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesExam && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Store Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30 flex items-center gap-1.5 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Official EduPrime Bookstore
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Class 11 & 12 Reference Books & Formula Sheets
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Handpicked study material, previous years solved question banks, and NCERT fingertips delivered straight to your home with free shipping on orders above ₹500.
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-200 pt-2">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Fast 2-3 Day Express Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>100% Genuine Publications</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Exam Tag Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {["All", "JEE", "NEET", "CBSE"].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedExamFilter(tag)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedExamFilter === tag
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tag === "All" ? "All Exam Books" : `${tag} Target`}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by book title or author..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => {
          const inCart = cart.some((item) => item.book.id === book.id);
          const discountPct = Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100);

          return (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group"
            >
              {/* Product Cover Image Container */}
              <div className="relative bg-slate-50 p-6 flex items-center justify-center overflow-hidden border-b border-slate-100">
                <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded-md shadow-xs">
                  {book.targetExam}
                </span>

                <span className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                  {discountPct}% OFF
                </span>

                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-36 h-48 object-cover rounded-lg shadow-lg group-hover:scale-105 transition transform duration-300"
                />
              </div>

              {/* Book Info Details */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{book.classLevel}</span>
                    <span className="flex items-center text-amber-500 font-bold gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {book.rating}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500">By {book.author}</p>
                </div>

                {/* Price & Add to Cart Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-slate-900">₹{book.price}</span>
                    <span className="text-xs text-slate-400 line-through ml-1.5">₹{book.originalPrice}</span>
                  </div>

                  <button
                    onClick={() => addToCart(book)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition ${
                      inCart
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>In Cart</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
