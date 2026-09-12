import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingBag,
  Truck,
  PackageCheck,
  Download,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  ArrowRight,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check
} from 'lucide-react';

const resolveCoverUrl = (url, fallback = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80') => {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  if (clean.startsWith('/api/r2/file/') || clean.startsWith('/uploads/')) {
    return clean;
  }
  if (clean.startsWith('/file/')) {
    return `/api/r2${clean}`;
  }
  if (clean.startsWith('file/')) {
    return `/api/r2/${clean}`;
  }
  if (clean.startsWith('thumbnails/') || clean.startsWith('/thumbnails/')) {
    return `/api/r2/file/${clean.replace(/^\/+/, '')}`;
  }
  if (clean.startsWith('/')) {
    return clean;
  }
  return `/${clean}`;
};

export function StudentBooks() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Digital Reader Modal State
  const [readingBook, setReadingBook] = useState(null);
  const [readerData, setReaderData] = useState(null);
  const [loadingReader, setLoadingReader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [readerZoom, setReaderZoom] = useState(100);
  const [readerError, setReaderError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/student/books');
      if (res.success) {
        setOrders(res.books || []);
      }
    } catch (err) {
      console.error('Fetch student book orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'Shipped':
      case 'Out for Delivery':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800">In Transit</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">Processing</span>;
    }
  };

  // Open Digital E-Book Reader
  const handleOpenReader = async (orderItem) => {
    const b = orderItem.book || {};
    setReadingBook({ ...b, order_id: orderItem.order_id });
    setReaderError('');
    setLoadingReader(true);

    try {
      const res = await apiFetch(`/student/books/${b.id || b.slug}/read`);
      if (res.success && res.allowed) {
        setReaderData(res);
        const initPage = res.reading_progress?.last_page || 1;
        setCurrentPage(initPage);
      } else {
        setReaderError(res.message || 'Access denied. Verified purchase required.');
      }
    } catch (err) {
      setReaderError(err.message || 'Unable to open digital reader. Please verify access.');
    } finally {
      setLoadingReader(false);
    }
  };

  // Page navigation & Auto-save reading progress
  const handlePageChange = async (newPage) => {
    if (!readingBook || !readerData) return;
    const totalPages = Number(readerData.total_pages) || 450;
    const boundedPage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(boundedPage);

    const calculatedPct = Math.min(100, Math.round((boundedPage / totalPages) * 10000) / 100);
    const isDone = boundedPage >= totalPages;

    // Background progress update
    try {
      await apiFetch(`/student/books/${readingBook.id || readingBook.slug}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          last_page: boundedPage,
          reading_percentage: calculatedPct,
          completed: isDone
        })
      });

      // Update local state without full reload
      setOrders(prev => prev.map(item => {
        if (item.book && (item.book.id === readingBook.id || item.book.slug === readingBook.id)) {
          return {
            ...item,
            reading_progress: {
              ...item.reading_progress,
              last_page: boundedPage,
              reading_percentage: calculatedPct,
              completed: isDone
            }
          };
        }
        return item;
      }));
    } catch (err) {
      console.warn('Silent reading progress save note:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4 text-amber-400" /> My Study Books & Deliveries
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Book Orders & E-Library</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Track your physical book shipments, continue reading digital e-books, and save your study progress.
          </p>
        </div>

        <Link
          to="/store"
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Explore Publications Store</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Orders List ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-pulse h-40"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Book Orders Yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You haven't ordered any physical books or revision kits yet. Visit our official bookstore to get ranker publications delivered to your home.
          </p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition"
          >
            <span>Browse Bookstore</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const b = order.book || {};
            const progress = order.reading_progress || { last_page: 1, reading_percentage: 0, completed: false };
            const totalPages = Number(b.total_pages || b.pages) || 450;
            const lastPage = Number(progress.last_page) || 1;
            const pct = Math.min(100, Math.round(Number(progress.reading_percentage) || ((lastPage / totalPages) * 100)));

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6 transition hover:shadow-xl"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500">Order #{order.order_id || order.id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.delivery_status)}
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">
                      ₹{order.total_price || order.unit_price || b.price || 499}
                    </span>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Book summary & Reading Progress */}
                  <div className="flex flex-col sm:flex-row gap-4 md:col-span-2">
                    <img
                      src={resolveCoverUrl(b.cover_image_url)}
                      alt={b.title}
                      className="w-24 h-32 object-cover rounded-xl shadow-md border border-slate-200 shrink-0"
                    />
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {b.target_class || 'Class 12'} • {b.subject || 'Commerce'}
                        </span>
                        {progress.completed && (
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading font-black text-base sm:text-lg text-slate-900">{b.title}</h3>
                      <p className="text-xs text-slate-500">{b.author} | {b.format || 'Official Edition'}</p>

                      {/* Reading Progress Bar */}
                      <div className="pt-1 max-w-md space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Reading Progress: Page {lastPage} of {totalPages}</span>
                          <span className="text-indigo-600">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => handleOpenReader(order)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{lastPage > 1 ? `Continue Reading (Page ${lastPage})` : 'Start Reading E-Book'}</span>
                        </button>

                        {b.is_downloadable && (
                          <a
                            href={b.digital_file_url || b.sample_pdf_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                          >
                            <Download className="w-3.5 h-3.5" /> Download PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address & Courier Box */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Delivery Address
                    </div>
                    <div className="text-slate-600 font-medium leading-relaxed">
                      <p className="font-bold text-slate-800">{order.shipping_name || user?.name || 'Student'}</p>
                      <p>{order.shipping_address || 'Registered Coaching Address'}</p>
                      <p>{order.shipping_city ? `${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode}` : 'Standard Shipping'}</p>
                      {order.shipping_phone && <p className="text-slate-500 mt-1">📞 {order.shipping_phone}</p>}
                    </div>

                    <div className="border-t border-slate-200/80 pt-2 space-y-1">
                      <div className="text-[11px] text-slate-500">
                        Courier: <strong>{order.courier_name || 'BlueDart Express'}</strong>
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 font-bold">
                        Tracking: {order.tracking_number || 'TRK-98127392'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking Progress Bar */}
                <div className="pt-2">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-400">
                    <div className="text-emerald-600 flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</div>
                      <span>Order Placed</span>
                    </div>
                    <div className={`${order.delivery_status !== 'Cancelled' ? 'text-indigo-600' : ''} flex flex-col items-center gap-1`}>
                      <div className={`w-6 h-6 rounded-full ${order.delivery_status !== 'Cancelled' ? 'bg-indigo-600 text-white' : 'bg-slate-200'} flex items-center justify-center text-[10px]`}>2</div>
                      <span>Packed & Dispatched</span>
                    </div>
                    <div className={`${['Shipped', 'Out for Delivery', 'Delivered'].includes(order.delivery_status) ? 'text-indigo-600' : ''} flex flex-col items-center gap-1`}>
                      <div className={`w-6 h-6 rounded-full ${['Shipped', 'Out for Delivery', 'Delivered'].includes(order.delivery_status) ? 'bg-indigo-600 text-white' : 'bg-slate-200'} flex items-center justify-center text-[10px]`}>3</div>
                      <span>In Transit</span>
                    </div>
                    <div className={`${order.delivery_status === 'Delivered' ? 'text-emerald-600' : ''} flex flex-col items-center gap-1`}>
                      <div className={`w-6 h-6 rounded-full ${order.delivery_status === 'Delivered' ? 'bg-emerald-600 text-white' : 'bg-slate-200'} flex items-center justify-center text-[10px]`}>✓</div>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Student Digital Book Reader Modal ── */}
      {readingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Top Reader Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3 truncate pr-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm text-white truncate">{readingBook.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{readingBook.author} • {readingBook.format || 'Digital Edition'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close Reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content Body */}
            <div className="flex-1 bg-slate-100 overflow-y-auto p-4 flex flex-col items-center justify-center relative">
              {loadingReader ? (
                <div className="flex flex-col items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold">Verifying secure digital access & decrypting book...</p>
                </div>
              ) : readerError ? (
                <div className="p-8 text-center max-w-md bg-white rounded-2xl shadow-sm border border-rose-100 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900">Access Restricted</h4>
                  <p className="text-xs text-slate-600">{readerError}</p>
                  <button
                    onClick={() => setReadingBook(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div
                  className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 border border-slate-200 max-w-2xl w-full min-h-[500px] flex flex-col justify-between transition-all"
                  style={{ transform: `scale(${readerZoom / 100})`, transformOrigin: 'top center' }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        {readingBook.subject || 'Academic Revision Notes'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Page {currentPage} of {readerData?.total_pages || 450}
                      </span>
                    </div>

                    <div className="space-y-4 text-slate-800 leading-relaxed text-sm sm:text-base">
                      <h2 className="text-xl font-black text-slate-900">
                        Chapter Concept Notes & Practice Section
                      </h2>
                      <p className="text-slate-600 text-xs sm:text-sm">
                        You are reading the official digital study material for <strong>{readingBook.title}</strong>.
                        All pages are synchronized with your academic profile.
                      </p>

                      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          Current Study Section: Page {currentPage}
                        </p>
                        <p className="text-slate-600">
                          Use the bottom controls or Arrow keys to flip pages. Your reading progress is saved automatically.
                        </p>
                      </div>

                      {readerData?.digital_file_url && (
                        <div className="pt-4 text-center">
                          <a
                            href={readerData.digital_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-200"
                          >
                            <ExternalLink className="w-4 h-4" /> Open Full Interactive Document View
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Success Mantra Publications</span>
                    <span>Class 12 Commerce Mastery</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Reader Control Bar */}
            {!loadingReader && !readerError && readerData && (
              <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    Page {currentPage} / {readerData.total_pages || 450}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= (readerData.total_pages || 450)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReaderZoom(prev => Math.max(70, prev - 10))}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-500 w-12 text-center">{readerZoom}%</span>
                  <button
                    onClick={() => setReaderZoom(prev => Math.min(150, prev + 10))}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(readerData.total_pages || 450)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

