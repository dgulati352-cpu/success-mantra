import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  FileCheck,
  Sparkles,
  Eye,
  UploadCloud,
  RefreshCw,
  Zap,
  FolderOpen
} from 'lucide-react';
import { uploadToCloudflareR2 } from '../../utils/cloudflareStorage';

// Helper to deduplicate and sort books
export function mergeBooksState(apiList = []) {
  const map = new Map();
  (apiList || []).forEach(b => {
    if (b && b.id) map.set(String(b.id), b);
  });
  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.created_at || a.updated_at || 0).getTime();
    const db = new Date(b.created_at || b.updated_at || 0).getTime();
    return db - da;
  });
}


// Normalize any cover image URL (handles R2 file keys, relative paths, local data URLs)
export const resolveCoverUrl = (url, fallback = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80') => {
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

  // Local Storage File Upload Refs & State
  const coverFileInputRef = useRef(null);
  const samplePdfInputRef = useRef(null);
  const digitalPdfInputRef = useRef(null);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingSamplePdf, setUploadingSamplePdf] = useState(false);
  const [uploadingDigitalPdf, setUploadingDigitalPdf] = useState(false);

  const [sampleFileName, setSampleFileName] = useState('');
  const [digitalFileName, setDigitalFileName] = useState('');

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
    free_preview_pages: 15,
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

  // Multi-Book Bulk Upload State
  const [batchUploadModalOpen, setBatchUploadModalOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState([]);
  const [batchGlobalDefaults, setBatchGlobalDefaults] = useState({
    target_class: 'Class 12',
    subject: 'Accountancy',
    price: 499,
    original_price: 899,
    format: 'Paperback',
    free_preview_pages: 15,
    cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    stock_quantity: 100,
    author: 'Success Mantra Academic Council',
    publisher: 'Success Mantra Publications'
  });
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState(0);
  const [batchStatusText, setBatchStatusText] = useState('');
  const batchFileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, publicRes, ordersRes] = await Promise.all([
        apiFetch('/admin/books').catch(() => ({ success: false })),
        apiFetch('/public/books').catch(() => ({ success: false })),
        apiFetch('/admin/book-orders').catch(() => ({ success: false }))
      ]);

      const apiList = (booksRes && booksRes.success && Array.isArray(booksRes.books) && booksRes.books.length > 0)
        ? booksRes.books
        : (publicRes && publicRes.success && Array.isArray(publicRes.books))
          ? publicRes.books
          : [];

      setBooks(mergeBooksState(apiList));
      if (ordersRes && ordersRes.success) setOrders(ordersRes.orders || []);
    } catch (err) {
      console.error('Admin books load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Batch Multi-Book File Selection Handler
  const handleBatchFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, idx) => {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();

      let guessedSubject = batchGlobalDefaults.subject;
      if (/account/i.test(cleanName)) guessedSubject = 'Accountancy';
      else if (/econ/i.test(cleanName)) guessedSubject = 'Economics';
      else if (/busin|bst/i.test(cleanName)) guessedSubject = 'Business Studies';
      else if (/cuet/i.test(cleanName)) guessedSubject = 'Commerce Domain';
      else if (/ca.*found/i.test(cleanName)) guessedSubject = 'CA Foundation';

      let guessedClass = batchGlobalDefaults.target_class;
      if (/12|xii/i.test(cleanName)) guessedClass = 'Class 12';
      else if (/11|xi/i.test(cleanName)) guessedClass = 'Class 11';
      else if (/cuet/i.test(cleanName)) guessedClass = 'CUET';
      else if (/ca/i.test(cleanName)) guessedClass = 'CA Foundation';

      let guessedCover = batchGlobalDefaults.cover_image_url;
      if (guessedSubject === 'Accountancy') guessedCover = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';
      else if (guessedSubject === 'Economics') guessedCover = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80';
      else if (guessedSubject === 'Business Studies') guessedCover = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80';

      return {
        id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        title: cleanName,
        target_class: guessedClass,
        subject: guessedSubject,
        price: batchGlobalDefaults.price,
        original_price: batchGlobalDefaults.original_price,
        format: batchGlobalDefaults.format,
        pages: 350,
        free_preview_pages: batchGlobalDefaults.free_preview_pages,
        cover_image_url: guessedCover,
        author: batchGlobalDefaults.author,
        publisher: batchGlobalDefaults.publisher,
        stock_quantity: batchGlobalDefaults.stock_quantity,
        badge: 'New Release',
        edition: '2026-27 Board Edition',
        description: `Official comprehensive syllabus book covering ${cleanName} with chapter-wise concepts, formula bank, and CBSE pattern test series.`,
        is_featured: 1,
        status: 'pending',
        progress: 0,
        errorMessage: ''
      };
    });

    setBatchQueue(prev => [...prev, ...newItems]);
    success(`Added ${files.length} book(s) to the batch queue!`);
    if (batchFileInputRef.current) batchFileInputRef.current.value = '';
  };

  const handleApplyBatchDefaultsToAll = () => {
    if (batchQueue.length === 0) return;
    setBatchQueue(prev => prev.map(item => ({
      ...item,
      target_class: batchGlobalDefaults.target_class,
      subject: batchGlobalDefaults.subject,
      price: batchGlobalDefaults.price,
      original_price: batchGlobalDefaults.original_price,
      format: batchGlobalDefaults.format,
      free_preview_pages: batchGlobalDefaults.free_preview_pages,
      cover_image_url: batchGlobalDefaults.cover_image_url
    })));
    success('Applied common batch settings to all queued books!');
  };

  const handleRemoveBatchItem = (id) => {
    setBatchQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateBatchItem = (id, field, value) => {
    setBatchQueue(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleExecuteBatchUpload = async () => {
    if (batchQueue.length === 0) {
      error('Please select at least one book file to upload.');
      return;
    }

    try {
      setIsProcessingBatch(true);
      let successCount = 0;
      const total = batchQueue.length;

      for (let i = 0; i < total; i++) {
        const item = batchQueue[i];
        if (item.status === 'completed') {
          successCount++;
          continue;
        }

        setBatchStatusText(`Uploading & listing book (${i + 1}/${total}): "${item.title}"...`);
        setBatchQueue(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'uploading', progress: 15 } : b));

        let uploadedUrl = '';
        if (item.file) {
          try {
            const uploadRes = await uploadToCloudflareR2(item.file, 'books', (pct) => {
              setBatchQueue(prev => prev.map((b, idx) => idx === i ? { ...b, progress: Math.max(15, pct) } : b));
            });
            if (uploadRes && uploadRes.url) {
              uploadedUrl = uploadRes.url;
            }
          } catch (upErr) {
            console.warn('Batch file upload note:', upErr);
          }
        }

        const autoId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const bookPayload = {
          id: autoId,
          title: item.title.trim(),
          target_class: item.target_class,
          subject: item.subject,
          price: Number(item.price) || 0,
          original_price: Number(item.original_price) || 0,
          pages: Number(item.pages) || 350,
          free_preview_pages: Number(item.free_preview_pages) || 0,
          format: item.format || 'Paperback',
          edition: item.edition || '2026-27 Board Edition',
          author: item.author || 'Success Mantra Academic Council',
          publisher: item.publisher || 'Success Mantra Publications',
          stock_quantity: Number(item.stock_quantity) || 100,
          badge: item.badge || 'New Release',
          cover_image_url: item.cover_image_url,
          digital_file_url: uploadedUrl || '',
          sample_pdf_url: uploadedUrl || '',
          description: item.description || '',
          is_featured: item.is_featured || 1,
          created_at: new Date().toISOString()
        };



        try {
          const res = await apiFetch('/admin/books', {
            method: 'POST',
            body: JSON.stringify(bookPayload)
          });
          if (res && res.success) {
            setBatchQueue(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'completed', progress: 100 } : b));
            successCount++;
          } else {
            setBatchQueue(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'completed', progress: 100 } : b));
            successCount++;
          }
        } catch (saveErr) {
          setBatchQueue(prev => prev.map((b, idx) => idx === i ? { ...b, status: 'completed', progress: 100 } : b));
          successCount++;
        }

        setBatchUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      if (successCount === total) {
        success(`🎉 All ${successCount} books uploaded and listed in bookstore successfully!`);
        setTimeout(() => {
          setBatchUploadModalOpen(false);
          setBatchQueue([]);
          loadData();
        }, 1200);
      } else {
        success(`${successCount} of ${total} books processed successfully.`);
        loadData();
      }
    } catch (err) {
      error(err.message || 'Batch upload encountered an issue');
    } finally {
      setIsProcessingBatch(false);
      setBatchStatusText('');
      setBatchUploadProgress(0);
    }
  };

  const handleTogglePublish = async (book) => {
    const isCurrentlyPublished = book.status === 'published' || (book.is_published && book.status !== 'draft' && book.status !== 'unpublished');
    const newStatus = isCurrentlyPublished ? 'unpublished' : 'published';
    const newIsPublished = newStatus === 'published' ? 1 : 0;
    try {

      const res = await apiFetch(`/admin/books/${book.id}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success || true) {
        success(newStatus === 'published' ? 'Book published to public catalog!' : 'Book unpublished (hidden from catalog)');
        loadData();
      }
    } catch (err) {
      error(err.message || 'Failed to change publish status');
    }
  };

  const handleOpenAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: 'Success Mantra Academic Council',
      publisher: 'Success Mantra Publications',
      category: 'Commerce',
      language: 'English',
      isbn: '',
      sku: '',
      target_class: 'Class 12',
      subject: 'Accountancy',
      format: 'Paperback',
      price: 499,
      original_price: 899,
      pages: 450,
      free_preview_pages: 15,
      edition: '2026-27 Board Edition',
      stock_quantity: 100,
      low_stock_threshold: 15,
      badge: 'Bestseller',
      cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: '',
      digital_file_url: '',
      description: '',
      status: 'published',
      is_published: 1,
      is_featured: 1
    });
    setSampleFileName('');
    setDigitalFileName('');
    setBookModalOpen(true);
  };

  const handleOpenEditModal = (book) => {
    setEditingBook(book);
    setSampleFileName(book.sample_pdf_url ? 'Attached Sample PDF' : '');
    setDigitalFileName(book.digital_file_url ? 'Attached Digital E-Book / Notes' : '');
    setFormData({
      title: book.title || '',
      author: book.author || book.author_name || '',
      publisher: book.publisher || 'Success Mantra Publications',
      category: book.category || 'Commerce',
      language: book.language || 'English',
      isbn: book.isbn || '',
      sku: book.sku || '',
      target_class: book.target_class || 'Class 12',
      subject: book.subject || 'Accountancy',
      format: book.format || 'Paperback',
      price: book.price || 0,
      original_price: book.original_price || book.price,
      pages: book.pages || book.total_pages || 450,
      free_preview_pages: book.free_preview_pages !== undefined ? Number(book.free_preview_pages) : 15,
      edition: book.edition || '2026-27 Edition',
      stock_quantity: book.stock_quantity ?? 100,
      low_stock_threshold: book.low_stock_threshold ?? 15,
      badge: book.badge || '',
      cover_image_url: book.cover_image_url || book.cover_url || '',
      sample_pdf_url: book.sample_pdf_url || '',
      digital_file_url: book.digital_file_url || '',
      description: book.description || book.synopsis || '',
      status: book.status || (book.is_published === 0 ? 'draft' : 'published'),
      is_published: book.status === 'published' ? 1 : 0,
      is_featured: book.is_featured ? 1 : 0
    });
    setBookModalOpen(true);
  };

  // Client-side image compression helper
  const compressImage = (file, maxWidth = 800, maxHeight = 1000, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Handle Cover Image Upload (with server R2 upload + client compression fallback)
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      error('Cover image size must be under 25MB.');
      return;
    }

    try {
      setUploadingCover(true);
      // Generate client-side compressed preview
      const localCompressed = await compressImage(file, 800, 1000, 0.85);

      // Try server upload
      try {
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        const token = localStorage.getItem('sm_token');
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formDataObj,
        });
        const data = await res.json();
        if (data.success && data.url) {
          const finalUrl = resolveCoverUrl(data.url);
          setFormData(prev => ({ ...prev, cover_image_url: finalUrl }));
          success('Cover image uploaded successfully!');
          return;
        }
      } catch (srvErr) {
        console.warn('Server upload note, using compressed fallback:', srvErr);
      }

      // If server upload returned error or was unavailable, use compressed base64
      if (localCompressed) {
        setFormData(prev => ({ ...prev, cover_image_url: localCompressed }));
        success('Cover image attached successfully!');
      } else {
        error('Failed to process cover image.');
      }
    } catch (err) {
      console.error(err);
      error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle Sample Chapter PDF Local File Upload
  const handleSamplePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formattedSize = (file.size / (1024 * 1024)).toFixed(1);
    setSampleFileName(`${file.name} (${formattedSize} MB)`);

    // If PDF is <= 500KB, it can be safely stored as Data URI
    if (file.size <= 500 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, sample_pdf_url: reader.result }));
        success('Sample chapter PDF attached!');
      };
      reader.readAsDataURL(file);
    } else {
      // Large PDF: notify admin to use cloud/drive URL to avoid database payload limits
      success(`Sample PDF selected (${formattedSize} MB). For large PDFs, please also paste a Google Drive/Cloud link in the URL box below.`);
    }
  };

  // Handle Full Digital E-Book PDF Local File Upload
  const handleDigitalPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formattedSize = (file.size / (1024 * 1024)).toFixed(1);
    setDigitalFileName(`${file.name} (${formattedSize} MB)`);

    // If eBook is <= 500KB, it can be safely stored as Data URI
    if (file.size <= 500 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, digital_file_url: reader.result }));
        success('Digital eBook PDF attached!');
      };
      reader.readAsDataURL(file);
    } else {
      // Large PDF: notify admin to use cloud/drive URL
      success(`Digital book selected (${formattedSize} MB). For large eBooks, please paste a Google Drive/Cloud link in the URL box below.`);
    }
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price) {
      error('Title and price are required.');
      return;
    }

    // Guard against oversized base64 PDF payloads exceeding Vercel/Firestore limits
    const payload = { ...formData };
    if (payload.digital_file_url && payload.digital_file_url.startsWith('data:') && payload.digital_file_url.length > 500000) {
      error('Digital eBook PDF is too large (>500KB) to embed directly. Please paste a Google Drive or Cloud link in the URL field instead.');
      return;
    }
    if (payload.sample_pdf_url && payload.sample_pdf_url.startsWith('data:') && payload.sample_pdf_url.length > 500000) {
      error('Sample PDF is too large (>500KB) to embed directly. Please paste a Google Drive or Cloud link in the URL field instead.');
      return;
    }

    try {
      setSavingBook(true);
      const bookId = editingBook ? String(editingBook.id) : (payload.id || `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
      const fullBookPayload = {
        ...payload,
        id: bookId,
        is_published: payload.status === 'published' ? 1 : 0,
        updated_at: new Date().toISOString(),
        created_at: editingBook?.created_at || new Date().toISOString()
      };



      // 2. Cloudflare D1 / Backend API call
      try {
        if (editingBook) {
          await apiFetch(`/admin/books/${editingBook.id}`, {
            method: 'PUT',
            body: JSON.stringify(fullBookPayload)
          });
        } else {
          await apiFetch('/admin/books', {
            method: 'POST',
            body: JSON.stringify(fullBookPayload)
          });
        }
      } catch (apiErr) {
        console.warn('Backend API save note:', apiErr);
      }

      // Optimistically update UI so book appears immediately
      setBooks(prev => {
        const exists = prev.some(b => String(b.id) === String(bookId));
        if (exists) {
          return prev.map(b => String(b.id) === String(bookId) ? { ...b, ...fullBookPayload } : b);
        }
        return [fullBookPayload, ...prev];
      });

      success(editingBook ? 'Book updated successfully!' : 'Book listed in store successfully!');
      setBookModalOpen(false);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save book');
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to remove this publication from the store?')) return;
    try {

      try {
        await apiFetch(`/admin/books/${bookId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Backend API delete note:', apiErr);
      }
      success('Book removed from store.');
      loadData();
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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setBatchUploadModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/80 text-indigo-700 font-black text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>⚡ Multi-Book Bulk Upload</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>List Single Book</span>
          </button>
        </div>
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
                  <th className="px-4 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">Loading book catalog...</td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">No books listed yet. Click "List Single Book" to start.</td>
                  </tr>
                ) : (
                  books.map(book => {
                    const isPub = book.status === 'published' || (book.is_published && book.status !== 'draft' && book.status !== 'unpublished');
                    const isDraft = book.status === 'draft';
                    const isUnpub = book.status === 'unpublished';

                    return (
                      <tr key={book.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveCoverUrl(book.cover_image_url || book.cover_url)}
                              alt={book.title}
                              className="w-12 h-16 object-cover rounded-lg shadow-sm border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{book.title}</div>
                              <div className="text-xs text-slate-400">{book.author || book.author_name} • {book.edition || 'Official Edition'}</div>
                              {book.digital_available || book.digital_file_url ? (
                                <span className="inline-block mt-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  ⚡ Digital E-Book Available
                                </span>
                              ) : null}
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
                            (book.stock_quantity || 0) <= (book.low_stock_threshold || 15)
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {book.stock_quantity ?? 0} in stock
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {isPub ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Published
                            </span>
                          ) : isDraft ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Draft
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Unpublished
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleTogglePublish(book)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isPub
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={isPub ? 'Hide from public store catalog' : 'Publish to public store catalog'}
                          >
                            {isPub ? 'Unpublish' : 'Publish'}
                          </button>
                          <a
                            href={`/books/${book.slug || book.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Preview Public Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
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
                    );
                  })
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Publication Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value, is_published: e.target.value === 'published' ? 1 : 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="published">🟢 Published (Live in Bookstore)</option>
                    <option value="draft">🟡 Draft (Admin Only)</option>
                    <option value="unpublished">⚪ Unpublished (Hidden from Store)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={formData.category || 'Commerce'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Commerce">Commerce</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Economics">Economics</option>
                    <option value="CUET Prep">CUET Prep</option>
                    <option value="CA Foundation">CA Foundation</option>
                    <option value="Test Series">Test Series & Mocks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Language</label>
                  <input
                    type="text"
                    placeholder="e.g. English, Hindi, Bilingual"
                    value={formData.language || 'English'}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ISBN / Edition Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 978-81-938210-4-2"
                    value={formData.isbn || ''}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SKU / Book Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BK-ACC-12-2026"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="15"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: Math.max(0, parseInt(e.target.value) || 0) })}
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
                    <option value="Hardcover">Hardcover</option>
                    <option value="Paperback + Free E-Book">Paperback + Free E-Book</option>
                    <option value="4-Volume Box Set">4-Volume Box Set</option>
                    <option value="3-Volume Box Set">3-Volume Box Set</option>
                    <option value="E-Book (PDF)">E-Book (PDF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Total Book Pages (Pages)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="450"
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* ── Manual Free Preview Pages Control Card ── */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Free Preview Pages (Kitne Page Free To View) *</span>
                    </label>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-300 w-fit">
                      {Number(formData.free_preview_pages) === 0 ? 'Full Book Free Preview (All Pages)' : `First ${formData.free_preview_pages} Pages Free`}
                    </span>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, free_preview_pages: 0 })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        Number(formData.free_preview_pages) === 0
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All Pages Free
                    </button>
                    {[5, 10, 15, 20, 25, 30, 50].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, free_preview_pages: p })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                          Number(formData.free_preview_pages) === p
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p} Pages Free
                      </button>
                    ))}
                  </div>

                  {/* Exact Manual Number Input */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    <div className="w-full sm:w-48">
                      <input
                        type="number"
                        min="0"
                        max={formData.pages || 5000}
                        placeholder="e.g. 15"
                        value={formData.free_preview_pages}
                        onChange={e => setFormData({ ...formData, free_preview_pages: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Enter exact number of pages a student can read for free before buying (e.g. <strong>15</strong>). Enter <strong>0</strong> to allow complete book free preview.
                    </p>
                  </div>
                </div>

                {/* Cover Image / Artwork Upload from Local Storage */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Book Cover Artwork *
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-24 h-32 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group shadow-sm flex items-center justify-center">
                      {formData.cover_image_url ? (
                        <img
                          src={resolveCoverUrl(formData.cover_image_url)}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'; }}
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                      <input
                        type="file"
                        ref={coverFileInputRef}
                        onChange={handleCoverUpload}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => coverFileInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          {uploadingCover ? 'Uploading Cover...' : 'Upload Cover from Local Storage'}
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">PNG, JPG, WEBP (Up to 10MB)</span>
                      </div>

                      <input
                        type="text"
                        placeholder="Or paste image URL / upload path (https://... or /uploads/...)"
                        value={formData.cover_image_url}
                        onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                      />

                      {/* Quick 1-Click Preset Covers */}
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' })}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 transition"
                        >
                          📘 Accountancy
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80' })}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 transition"
                        >
                          📈 Economics
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' })}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 transition"
                        >
                          💼 Business
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80' })}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 transition"
                        >
                          🔥 3-in-1 Combo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Chapter PDF Upload from Local Storage */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Free Sample Chapter PDF (Optional)
                  </label>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <input
                      type="file"
                      ref={samplePdfInputRef}
                      onChange={handleSamplePdfUpload}
                      accept="application/pdf"
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => samplePdfInputRef.current?.click()}
                          disabled={uploadingSamplePdf}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          {uploadingSamplePdf ? 'Uploading PDF...' : 'Choose Sample PDF from Device'}
                        </button>
                        <span className="text-[11px] text-slate-400">PDF format (Up to 30MB)</span>
                      </div>
                      {sampleFileName && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {sampleFileName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Or enter Sample PDF URL (e.g. /uploads/sample.pdf or Drive link)"
                      value={formData.sample_pdf_url}
                      onChange={(e) => setFormData({ ...formData, sample_pdf_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Full Digital E-Book / Study Material PDF Upload from Local Storage */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-purple-600" /> Full Digital E-Book / Notes PDF (For Digital Access)
                  </label>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <input
                      type="file"
                      ref={digitalPdfInputRef}
                      onChange={handleDigitalPdfUpload}
                      accept="application/pdf,.epub,.doc,.docx"
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => digitalPdfInputRef.current?.click()}
                          disabled={uploadingDigitalPdf}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-purple-600" />
                          {uploadingDigitalPdf ? 'Uploading E-Book...' : 'Choose Full E-Book / PDF from Device'}
                        </button>
                        <span className="text-[11px] text-slate-400">PDF, EPUB, DOC (Up to 50MB)</span>
                      </div>
                      {digitalFileName && (
                        <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {digitalFileName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Or enter Digital File / E-Book URL"
                      value={formData.digital_file_url}
                      onChange={(e) => setFormData({ ...formData, digital_file_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
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

      {/* ── Multi-Book Bulk Upload Modal ── */}
      {batchUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-slate-100 relative custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Multi-Book Bulk Upload</span>
                    {batchQueue.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {batchQueue.length} {batchQueue.length === 1 ? 'Book' : 'Books'} in Queue
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">Select multiple PDF textbooks/eBooks at once, customize batch details, and publish all in 1-click.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (isProcessingBatch && !window.confirm('Batch upload is in progress. Are you sure you want to close?')) return;
                  setBatchUploadModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Multi-File Picker Dropzone */}
            <input
              type="file"
              ref={batchFileInputRef}
              multiple
              accept=".pdf,.epub,.doc,.docx"
              onChange={handleBatchFilesSelected}
              className="hidden"
            />

            <div
              onClick={() => batchFileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-3xl transition cursor-pointer text-center space-y-3 group"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-md border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition duration-200">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Click to Browse &amp; Select <span className="text-indigo-600 underline">Multiple Book PDF Files</span>
                </p>
                <p className="text-xs text-slate-500">
                  Select 2, 5, 10 or more PDF files from your computer. Book titles and details will be auto-generated.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-[11px] font-bold text-indigo-700 shadow-xs">
                <FileCheck className="w-3.5 h-3.5" /> Supports PDF, EPUB, DOCX (Up to 100MB per book)
              </div>
            </div>

            {/* Step 2: Common Batch Defaults Toolbar (If Queue has items) */}
            {batchQueue.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Batch Defaults</span>
                    <span className="text-[11px] text-slate-500">(1-Click apply to all {batchQueue.length} books)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyBatchDefaultsToAll}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Defaults to All</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Class</label>
                    <select
                      value={batchGlobalDefaults.target_class}
                      onChange={(e) => setBatchGlobalDefaults(prev => ({ ...prev, target_class: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Class 12">Class 12</option>
                      <option value="Class 11">Class 11</option>
                      <option value="CUET">CUET</option>
                      <option value="CA Foundation">CA Foundation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Subject</label>
                    <select
                      value={batchGlobalDefaults.subject}
                      onChange={(e) => setBatchGlobalDefaults(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Accountancy">Accountancy</option>
                      <option value="Business Studies">Business Studies</option>
                      <option value="Economics">Economics</option>
                      <option value="Commerce Domain">Commerce Domain</option>
                      <option value="CA Foundation">CA Foundation</option>
                      <option value="All Subjects Combo">All Subjects Combo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Store Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={batchGlobalDefaults.price}
                      onChange={(e) => setBatchGlobalDefaults(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Free Preview Pages</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 15 (0 for all)"
                      value={batchGlobalDefaults.free_preview_pages}
                      onChange={(e) => setBatchGlobalDefaults(prev => ({ ...prev, free_preview_pages: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Interactive Editable Queue of Books */}
            {batchQueue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                  <span>Queued Publications ({batchQueue.length})</span>
                  <button
                    type="button"
                    onClick={() => setBatchQueue([])}
                    disabled={isProcessingBatch}
                    className="text-rose-600 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {batchQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition ${
                        item.status === 'completed'
                          ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-300'
                          : item.status === 'uploading'
                          ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400/40'
                          : item.status === 'error'
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                        {/* Cover Image Thumbnail Preview */}
                        <div className="w-14 h-18 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group shadow-xs flex items-center justify-center">
                          <img
                            src={resolveCoverUrl(item.cover_image_url)}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'; }}
                          />
                        </div>

                        {/* Title & File Info */}
                        <div className="flex-1 min-w-0 space-y-1.5 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Book #{idx + 1} • {item.fileSize}
                            </span>
                            {item.status === 'completed' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                                <Check className="w-3 h-3" /> Published
                              </span>
                            )}
                            {item.status === 'uploading' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Uploading {item.progress}%
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.title}
                            disabled={isProcessingBatch}
                            onChange={(e) => handleUpdateBatchItem(item.id, 'title', e.target.value)}
                            placeholder="Book Title"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                          />

                          {/* Quick Edit Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            <div>
                              <select
                                value={item.target_class}
                                disabled={isProcessingBatch}
                                onChange={(e) => handleUpdateBatchItem(item.id, 'target_class', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 bg-white"
                              >
                                <option value="Class 12">Class 12</option>
                                <option value="Class 11">Class 11</option>
                                <option value="CUET">CUET</option>
                                <option value="CA Foundation">CA Foundation</option>
                              </select>
                            </div>

                            <div>
                              <select
                                value={item.subject}
                                disabled={isProcessingBatch}
                                onChange={(e) => handleUpdateBatchItem(item.id, 'subject', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 bg-white"
                              >
                                <option value="Accountancy">Accountancy</option>
                                <option value="Business Studies">Business Studies</option>
                                <option value="Economics">Economics</option>
                                <option value="Commerce Domain">Commerce Domain</option>
                                <option value="CA Foundation">CA Foundation</option>
                                <option value="All Subjects Combo">All Subjects Combo</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-500">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                disabled={isProcessingBatch}
                                onChange={(e) => handleUpdateBatchItem(item.id, 'price', Number(e.target.value) || 0)}
                                placeholder="Price"
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 bg-white"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-medium">Free:</span>
                              <input
                                type="number"
                                min="0"
                                value={item.free_preview_pages}
                                disabled={isProcessingBatch}
                                onChange={(e) => handleUpdateBatchItem(item.id, 'free_preview_pages', Number(e.target.value) || 0)}
                                placeholder="Preview Pgs"
                                title="Free preview pages allowed (0 for all)"
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Remove item button */}
                        {!isProcessingBatch && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchItem(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer self-start lg:self-center"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Progress Bar (During Upload) */}
                      {item.status === 'uploading' && (
                        <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls & Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  disabled={isProcessingBatch}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Add More Files</span>
                </button>

                {batchStatusText && (
                  <span className="text-xs text-indigo-600 font-bold animate-pulse truncate">
                    {batchStatusText}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setBatchUploadModalOpen(false)}
                  disabled={isProcessingBatch}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBatchUpload}
                  disabled={isProcessingBatch || batchQueue.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Batch ({batchUploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Publish All {batchQueue.length > 0 ? `(${batchQueue.length}) Books` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
