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
  Sparkles
} from 'lucide-react';

export function StudentBooks() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
            Track your physical book shipments, view tracking numbers, and download digital formula sheets.
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
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6 transition hover:shadow-xl"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500">Order #{order.id}</span>
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
                      ₹{order.total_price || order.unit_price}
                    </span>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Book summary */}
                  <div className="flex gap-4 md:col-span-2">
                    <img
                      src={b.cover_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200'}
                      alt={b.title}
                      className="w-20 h-28 object-cover rounded-xl shadow-md border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {b.target_class || 'Class 12'} • {b.subject || 'Commerce'}
                      </span>
                      <h3 className="font-heading font-black text-base text-slate-900">{b.title}</h3>
                      <p className="text-xs text-slate-500">{b.author} | {b.format || 'Paperback Edition'}</p>
                      
                      <div className="pt-2 flex flex-wrap gap-2">
                        <a
                          href={b.sample_pdf_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Digital E-Book
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address & Courier Box */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Delivery Address
                    </div>
                    <div className="text-slate-600 font-medium leading-relaxed">
                      <p className="font-bold text-slate-800">{order.shipping_name}</p>
                      <p>{order.shipping_address}</p>
                      <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
                      <p className="text-slate-500 mt-1">📞 {order.shipping_phone}</p>
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
    </div>
  );
}
