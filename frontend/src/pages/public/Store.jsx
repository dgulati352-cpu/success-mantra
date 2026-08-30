import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSEO } from '../../hooks/useSEO';
import { BookCheckoutModal } from '../../components/common/BookCheckoutModal';
import { BookSampleReaderModal } from '../../components/common/BookSampleReaderModal';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
import {
  BookOpen,
  Search,
  Sparkles,
  Truck,
  Star,
  ShieldCheck,
  Filter,
  Eye,
  ShoppingBag,
  Zap,
  Award
} from 'lucide-react';

const DEFAULT_BOOKS = [
  {
    id: 'class-12-accounts-super-guide',
    slug: 'class-12-accountancy-mcq-book',
    title: 'Class 12 Accountancy MCQ Book',
    author: 'Success Mantra Council',
    target_class: 'Class 12',
    subject: 'Accountancy',
    format: 'Paperback + E-Book',
    price: 599,
    original_price: 999,
    discount_percentage: 40,
    rating: 4.96,
    reviews_count: 342,
    pages: 560,
    cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    description: 'Chapter-wise Class 12 Accountancy MCQs, 1 Mark Questions, Assertion-Reason questions, and full question bank for CBSE and CUET.'
  },
  {
    id: 'class-12-bst-mastery-book',
    slug: 'class-12-business-studies-mcq-book',
    title: 'Class 12 Business Studies MCQ Book',
    author: 'Success Mantra Council',
    target_class: 'Class 12',
    subject: 'Business Studies',
    format: 'Paperback',
    price: 499,
    original_price: 799,
    discount_percentage: 38,
    rating: 4.92,
    reviews_count: 218,
    pages: 420,
    cover_image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800',
    description: 'Master Class 12 BST MCQs, case study decoders, 1 Mark Questions, and NTA-pattern question banks for CBSE & CUET.'
  },
  {
    id: 'class-11-economics-handbook',
    slug: 'class-12-economics-mcq-book',
    title: 'Class 12 Economics MCQ Book',
    author: 'Success Mantra Council',
    target_class: 'Class 12',
    subject: 'Economics',
    format: 'Paperback + Concept Sheets',
    price: 549,
    original_price: 899,
    discount_percentage: 39,
    rating: 4.89,
    reviews_count: 185,
    pages: 480,
    cover_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    description: 'Introductory Macroeconomics and Indian Economic Development MCQs, formula shortcuts, and 1 Mark Questions for CBSE & CUET.'
  }
];

function getBookUrl(book) {
  if (book.slug) return `/books/${book.slug}`;
  const s = (book.subject || '').toLowerCase();
  const title = (book.title || '').toLowerCase();
  if (s.includes('account') || title.includes('account')) return '/books/class-12-accountancy-mcq-book';
  if (s.includes('business') || s.includes('bst') || title.includes('business')) return '/books/class-12-business-studies-mcq-book';
  if (s.includes('econom') || title.includes('econom')) return '/books/class-12-economics-mcq-book';
  return `/books/${book.id || 'class-12-accountancy-mcq-book'}`;
}

export function Store() {
  const canonicalUrl = `${SITE_CONFIG.domain}/books`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Books Store', url: '/books' }
  ]);

  useSEO({
    title: 'Class 12 Commerce MCQ Books & Study Material Store | Success Mantra',
    description: 'Buy Class 12 Accountancy, Business Studies & Economics MCQ Books for CBSE and CUET. Explore 1 Mark Question Banks and Toppers Notes with pan-India delivery.',
    keywords: 'Class 12 Accountancy MCQ Book, Class 12 Business Studies MCQ Book, Class 12 Economics MCQ Book, Class 12 Commerce Books, CBSE Question Bank, CUET MCQs, 1 Mark Questions, Success Mantra Saharanpur',
    canonical: canonicalUrl,
    schema: breadcrumbs
  });

  const { user } = useAuth();
  const [books, setBooks] = useState(DEFAULT_BOOKS);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCheckoutBook, setActiveCheckoutBook] = useState(null);
  const [previewBook, setPreviewBook] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, [selectedClass, selectedSubject, selectedFormat]);

  const fetchBooks = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'All') params.append('target_class', selectedClass);
      if (selectedSubject !== 'All') params.append('subject', selectedSubject);
      if (selectedFormat !== 'All') params.append('format', selectedFormat);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiFetch(`/public/books?${params.toString()}`);
      if (res.success && Array.isArray(res.books) && res.books.length > 0) {
        setBooks(res.books);
      }
    } catch (err) {
      console.debug('Fetch books note:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBooks();
  };

  const classes = ['All', 'Class 12', 'Class 11', 'CUET', 'CA Foundation'];
  const subjects = ['All', 'Accountancy', 'Business Studies', 'Economics', 'CA Foundation'];
  const formats = ['All', 'Paperback', 'Box Set'];

  const filteredBooks = books.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.subject && b.subject.toLowerCase().includes(q)) ||
      (b.target_class && b.target_class.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f8faff] pb-24">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-900 text-white pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md text-xs font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Official Success Mantra Publications & Bookstore
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Class 12 Commerce MCQ Books & <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">Question Banks</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Exhaustive chapter-wise MCQs, 1 Mark Questions, assertion-reason decoders, and CUET practice workbooks for Accountancy, Business Studies, and Economics. Free Pan-India doorstep delivery.
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <Truck className="w-4 h-4 text-emerald-400" /> Free Pan-India Delivery
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> 100% Latest CBSE & NTA CUET Syllabus
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <Award className="w-4 h-4 text-amber-400" /> Free Digital Notes Included
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters & Search Bar ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search by book title, author, subject, or class (e.g. Accountancy, BST, Economics, CUET)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Books</span>
            </button>
          </form>

          {/* Pill Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Class:
              </span>
              {classes.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedClass === c
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Subject:</span>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedSubject === s
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Book Catalog Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Available Publications</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Showing {filteredBooks.length} curated publications & study sets</p>
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 hidden sm:flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-emerald-600" /> Instant Dispatch & Real-Time Tracking
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-4">
                <div className="w-full h-64 bg-slate-200 rounded-2xl"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-10 bg-slate-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Books Found</h3>
            <p className="text-xs text-slate-500">Try changing your search query or selecting a different class filter.</p>
            <button
              onClick={() => { setSelectedClass('All'); setSelectedSubject('All'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBooks.map(book => {
              const bookUrl = getBookUrl(book);

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1.5"
                >
                  {/* Book Cover Image Area */}
                  <Link to={bookUrl} className="relative h-64 overflow-hidden bg-slate-950/5 flex items-center justify-center p-4">
                    <img
                      src={book.cover_image_url || book.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                      alt={`${book.title} - Success Mantra MCQ Book for CBSE & CUET`}
                      className="h-full max-w-[200px] object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                      width="200"
                      height="260"
                      loading="lazy"
                    />

                    {/* Badge */}
                    {book.badge && (
                      <span className="absolute top-4 left-4 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                        {book.badge}
                      </span>
                    )}

                    {/* Discount Tag */}
                    {(book.discount_percentage > 0 || (book.original_price && book.original_price > book.price)) && (
                      <span className="absolute top-4 right-4 text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-600 text-white shadow-md">
                        {book.discount_percentage || Math.round(((book.original_price - book.price) / book.original_price) * 100)}% OFF
                      </span>
                    )}
                  </Link>

                  {/* Book Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Tags / Meta */}
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                          {book.target_class} • {book.subject}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span className="text-slate-800 font-black">{book.rating || 4.9}</span>
                          <span className="text-slate-400 font-normal">({book.reviews_count || 120})</span>
                        </div>
                      </div>

                      <h3 className="font-heading font-black text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition">
                        <Link to={bookUrl}>
                          {book.title}
                        </Link>
                      </h3>

                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                        <span>By <strong>{book.author || 'Success Mantra Council'}</strong></span>
                        <span>•</span>
                        <span>{book.format || 'Paperback'}</span>
                      </div>
                    </div>

                    {/* Pricing & Actions */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900">₹{Number(book.price).toLocaleString('en-IN')}</span>
                          {book.original_price && (
                            <span className="text-xs text-slate-400 line-through">₹{book.original_price}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          🚚 Free Shipping
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          to={bookUrl}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> View Book
                        </Link>

                        <button
                          onClick={() => setActiveCheckoutBook(book)}
                          className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5-Page Sample Reader Modal ── */}
      {previewBook && (
        <BookSampleReaderModal
          isOpen={!!previewBook}
          onClose={() => setPreviewBook(null)}
          book={previewBook}
          onOrderClick={(bookToBuy) => {
            setActiveCheckoutBook(bookToBuy);
          }}
        />
      )}

      {/* ── Razorpay Book Checkout Modal ── */}
      {activeCheckoutBook && (
        <BookCheckoutModal
          isOpen={!!activeCheckoutBook}
          onClose={() => setActiveCheckoutBook(null)}
          book={activeCheckoutBook}
          onSuccess={() => {
            fetchBooks();
          }}
        />
      )}
    </div>
  );
}
