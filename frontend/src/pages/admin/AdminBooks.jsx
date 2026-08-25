import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Filter,
  DollarSign,
  Layers,
  ArrowRight,
  ExternalLink,
  MapPin,
  X
} from 'lucide-react';

export function AdminBooks() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('books'); // 'books' | 'orders'
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [savingBook, setSavingBook] = useState(false);

  // Book Form State
  const [formData, setFormData] = useState({
    title: '',
    author: 'Success Mantra Academic Council',
    publisher: 'Success Mantra Publications',
    isbn: '',
    target_class: 'Class 12',
    subject: 'Accountancy',
    format: 'Paperback',
    price: 499,
    original_price: 899,
    pages: 450,
    edition: '2026-27 Board Edition',
    stock_quantity: 100,
    badge: 'Bestseller',
    cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    sample_pdf_url: '',
    digital_file_url: '',
    description: '',
    is_featured: 1
  });

  // Order Dispatch Modal State
  const [editingOrder, setEditingOrder] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('Processing');
  const [courierName, setCourierName] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, ordersRes] = await Promise.all([
        apiFetch('/admin/books'),
        apiFetch('/admin/book-orders')
      ]);

      if (booksRes.success) setBooks(booksRes.books || []);
      if (ordersRes.success) setOrders(ordersRes.orders || []);
    } catch (err) {
      console.error('Admin books load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: 'Success Mantra Academic Council',
      publisher: 'Success Mantra Publications',
      isbn: '',
      target_class: 'Class 12',
      subject: 'Accountancy',
      format: 'Paperback',
      price: 499,
      original_price: 899,
      pages: 450,
      edition: '2026-27 Board Edition',
      stock_quantity: 100,
      badge: 'Bestseller',
      cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: '',
      digital_file_url: '',
      description: '',
      is_featured: 1
    });
    setBookModalOpen(true);
  };

  const handleOpenEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title || '',
      author: book.author || '',
      publisher: book.publisher || 'Success Mantra Publications',
      isbn: book.isbn || '',
      target_class: book.target_class || 'Class 12',
      subject: book.subject || 'Accountancy',
      format: book.format || 'Paperback',
      price: book.price || 0,
      original_price: book.original_price || book.price,
      pages: book.pages || 450,
      edition: book.edition || '2026-27 Edition',
      stock_quantity: book.stock_quantity ?? 100,
      badge: book.badge || '',
      cover_image_url: book.cover_image_url || '',
      sample_pdf_url: book.sample_pdf_url || '',
      digital_file_url: book.digital_file_url || '',
      description: book.description || '',
      is_featured: book.is_featured ? 1 : 0
    });
    setBookModalOpen(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price) {
      error('Title and price are required.');
      return;
    }

    try {
      setSavingBook(true);
      if (editingBook) {
        const res = await apiFetch(`/admin/books/${editingBook.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res.success) {
          success('Book updated successfully!');
          setBookModalOpen(false);
          loadData();
        }
      } else {
        const res = await apiFetch('/admin/books', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (res.success) {
          success('Book listed in store successfully!');
          setBookModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      error(err.message || 'Failed to save book');
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to remove this publication from the store?')) return;
    try {
      const res = await apiFetch(`/admin/books/${bookId}`, { method: 'DELETE' });
      if (res.success) {
        success('Book removed from store.');
        loadData();
      }
    } catch (err) {
      error(err.message || 'Delete failed');
    }
  };

  const handleOpenDispatchModal = (order) => {
    setEditingOrder(order);
    setDeliveryStatus(order.delivery_status || 'Processing');
    setCourierName(order.courier_name || 'BlueDart Express');
    setTrackingNumber(order.tracking_number || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`);
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setUpdatingOrder(true);
      const res = await apiFetch(`/admin/book-orders/${editingOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          delivery_status: deliveryStatus,
          courier_name: courierName,
          tracking_number: trackingNumber
        })
      });

      if (res.success) {
        success('Delivery tracking updated!');
        setEditingOrder(null);
        loadData();
      }
    } catch (err) {
      error(err.message || 'Update failed');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const totalStock = books.reduce((sum, b) => sum + (Number(b.stock_quantity) || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_price || o.unit_price) || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bookstore & Publications ERP</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            List official study books, manage warehouse stock, and dispatch student courier shipments.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>List New Book in Store</span>
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Publications Listed</span>
          <div className="text-2xl font-black text-slate-900">{books.length} Books</div>
          <span className="text-xs text-indigo-600 font-semibold">100% Active in Store</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Warehouse Stock</span>
          <div className="text-2xl font-black text-slate-900">{totalStock} Units</div>
          <span className="text-xs text-emerald-600 font-semibold">Ready for Dispatch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Book Orders</span>
          <div className="text-2xl font-black text-slate-900">{orders.length} Orders</div>
          <span className="text-xs text-purple-600 font-semibold">Pan-India Students</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Book Sales Revenue</span>
          <div className="text-2xl font-black text-emerald-600">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-xs text-slate-500 font-semibold">Direct Razorpay Collection</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'books'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Book Catalog & Stock ({books.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Student Orders & Shipping ({orders.length})</span>
        </button>
      </div>

      {/* ── TAB 1: Books Catalog Table ── */}
      {activeTab === 'books' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Publication / Title</th>
                  <th className="px-4 py-4">Class & Subject</th>
                  <th className="px-4 py-4">Format</th>
                  <th className="px-4 py-4">Price / MRP</th>
                  <th className="px-4 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">Loading book catalog...</td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">No books listed yet. Click "List New Book" to start.</td>
                  </tr>
                ) : (
                  books.map(book => (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={book.cover_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded-lg shadow-sm border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">{book.title}</div>
                            <div className="text-xs text-slate-400">{book.author} • {book.edition}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
                          {book.target_class} • {book.subject}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-slate-600">
                        {book.format || 'Paperback'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-black text-slate-900">₹{book.price}</div>
                        {book.original_price && (
                          <div className="text-xs text-slate-400 line-through">₹{book.original_price}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          (book.stock_quantity || 0) < 20
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {book.stock_quantity ?? 0} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(book)}
                          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit Book Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Student Book Orders Table ── */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-4 py-4">Student & Address</th>
                  <th className="px-4 py-4">Book Ordered</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Status & Tracking</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">Loading student book orders...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">No student book purchases recorded yet.</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">#{order.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{order.student_name || order.shipping_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{order.student_phone || order.shipping_phone}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{order.shipping_address}, {order.shipping_city}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800 line-clamp-1">{order.book_title}</div>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-900">
                        ₹{order.total_price || order.unit_price}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          order.delivery_status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.delivery_status === 'Shipped'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.delivery_status || 'Processing'}
                        </span>
                        {order.tracking_number && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {order.courier_name}: {order.tracking_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenDispatchModal(order)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                        >
                          Update Tracking
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Book Modal ── */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setBookModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {editingBook ? 'Edit Publication' : 'List New Publication in Bookstore'}
              </h2>
              <p className="text-xs text-slate-500">Provide book details, pricing, and stock for students to purchase.</p>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete Accountancy Mastery Class 12"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Author Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CA Ankit Garg"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="Success Mantra Publications"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Class</label>
                  <select
                    value={formData.target_class}
                    onChange={(e) => setFormData({ ...formData, target_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Class 12">Class 12</option>
                    <option value="Class 11">Class 11</option>
                    <option value="CUET">CUET</option>
                    <option value="CA Foundation">CA Foundation</option>
                    <option value="General">General Commerce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Accountancy">Accountancy</option>
                    <option value="Business Studies">Business Studies</option>
                    <option value="Economics">Economics</option>
                    <option value="CA Foundation">CA Foundation</option>
                    <option value="Commerce Foundation">Commerce Foundation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="499"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Original MRP (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="899"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Stock Quantity (Units)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Paperback">Paperback</option>
                    <option value="Paperback + Free E-Book">Paperback + Free E-Book</option>
                    <option value="4-Volume Box Set">4-Volume Box Set</option>
                    <option value="3-Volume Box Set">3-Volume Box Set</option>
                    <option value="E-Book (PDF)">E-Book (PDF)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description & Synopsis</label>
                  <textarea
                    rows={3}
                    placeholder="Comprehensive features, chapter coverage, sample papers..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {savingBook ? 'Publishing...' : editingBook ? 'Save Changes' : 'Publish Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Update Dispatch / Tracking Modal ── */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">Update Courier & Tracking</h2>
              <p className="text-xs text-slate-500">Order #{editingOrder.id} for {editingOrder.student_name}</p>
            </div>

            <form onSubmit={handleSaveDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Delivery Status</label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Processing">Processing (Packing Order)</option>
                  <option value="Shipped">Shipped (Handed to Courier)</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered Successfully</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Courier Partner</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="BlueDart Express">BlueDart Express</option>
                  <option value="Delhivery Express">Delhivery Express</option>
                  <option value="DTDC Courier">DTDC Courier</option>
                  <option value="India Post SpeedPost">India Post SpeedPost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tracking AWB / Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRK-881293812"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingOrder}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  {updatingOrder ? 'Saving...' : 'Save Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
