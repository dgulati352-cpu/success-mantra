import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Crown,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  Users,
  Clock,
  ShieldCheck,
  Tag,
  IndianRupee,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function AdminMemberships() {
  const { success, error } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    original_price: '',
    duration_months: 1,
    billing_interval: 'billed monthly',
    badge: '',
    description: '',
    status: 'active',
    sort_order: 1,
    autopay_enabled: true,
    autopay_interval: 'monthly',
    autopay_discount_pct: 0,
    features: ['']
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/memberships');
      if (res.success) {
        setPlans(res.plans || []);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      error('Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      original_price: '',
      duration_months: 1,
      billing_interval: 'billed monthly',
      badge: '',
      description: '',
      status: 'active',
      sort_order: plans.length + 1,
      autopay_enabled: true,
      autopay_interval: 'monthly',
      autopay_discount_pct: 0,
      features: [
        'Unlimited Daily Live Interactive Masterclasses',
        'Full NTA & CBSE Pattern Mock Test Series',
        'Digital Formula Booklets & Summary Notes',
        '24/7 Priority Doubt Desk'
      ]
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      price: plan.price || '',
      original_price: plan.original_price || '',
      duration_months: plan.duration_months || 1,
      billing_interval: plan.billing_interval || 'billed monthly',
      badge: plan.badge || '',
      description: plan.description || '',
      status: plan.status || 'active',
      sort_order: plan.sort_order || 1,
      autopay_enabled: plan.autopay_enabled !== false,
      autopay_interval: plan.autopay_interval || 'monthly',
      autopay_discount_pct: plan.autopay_discount_pct || 0,
      features: Array.isArray(plan.features) && plan.features.length > 0 ? plan.features : ['']
    });
    setModalOpen(true);
  };

  const handleFeatureChange = (index, value) => {
    const updated = [...formData.features];
    updated[index] = value;
    setFormData({ ...formData, features: updated });
  };

  const handleAddFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const handleRemoveFeature = (index) => {
    const updated = formData.features.filter((_, idx) => idx !== index);
    setFormData({ ...formData, features: updated.length ? updated : [''] });
  };

  const handleToggleStatus = async (planId) => {
    try {
      const res = await apiFetch(`/admin/memberships/${planId}/toggle-status`, { method: 'PATCH' });
      if (res.success) {
        success(res.message);
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: res.status } : p));
      }
    } catch (err) {
      error(err.message || 'Failed to toggle status');
    }
  };

  const handleToggleAutoPay = async (planId) => {
    try {
      const res = await apiFetch(`/admin/memberships/${planId}/toggle-autopay`, { method: 'PATCH' });
      if (res.success) {
        success(res.message);
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, autopay_enabled: res.autopay_enabled } : p));
      }
    } catch (err) {
      error(err.message || 'Failed to toggle AutoPay');
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${planName}"?`)) return;

    try {
      const res = await apiFetch(`/admin/memberships/${planId}`, { method: 'DELETE' });
      if (res.success) {
        success(res.message);
        setPlans(prev => prev.filter(p => p.id !== planId));
      }
    } catch (err) {
      error(err.message || 'Failed to delete plan');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      error('Please enter plan name and price');
      return;
    }

    const cleanedFeatures = formData.features.map(f => f.trim()).filter(Boolean);
    if (!cleanedFeatures.length) {
      error('Please add at least one benefit/feature');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      original_price: Number(formData.original_price) || Math.round(Number(formData.price) * 1.5),
      duration_months: Number(formData.duration_months) || 1,
      billing_interval: formData.billing_interval.trim(),
      badge: formData.badge.trim(),
      description: formData.description.trim(),
      status: formData.status,
      sort_order: Number(formData.sort_order) || 1,
      autopay_enabled: Boolean(formData.autopay_enabled),
      autopay_interval: formData.autopay_interval || 'monthly',
      autopay_discount_pct: Number(formData.autopay_discount_pct) || 0,
      features: cleanedFeatures
    };

    try {
      setSubmitting(true);
      if (editingPlan) {
        const res = await apiFetch(`/admin/memberships/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          success(res.message || 'Plan updated successfully!');
          setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...res.plan } : p));
          setModalOpen(false);
        }
      } else {
        const res = await apiFetch('/admin/memberships', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          success(res.message || 'Plan created successfully!');
          setPlans(prev => [...prev, res.plan]);
          setModalOpen(false);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to save membership plan');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSubscribers = plans.reduce((sum, p) => sum + (Number(p.active_subscribers) || 0), 0);
  const activePlansCount = plans.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Commerce Monetization & Subscriptions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            VIP Membership Plans Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure subscription tiers, UPI AutoPay / recurring e-mandates, durations, promotional badges, and exclusive features for scholar passes.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New VIP Tier</span>
        </button>
      </div>

      {/* ── Metrics Stats Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tiers</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{activePlansCount} / {plans.length} Live</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Available for student enrollment</div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIP Scholars</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSubscribers} Active</div>
          <div className="text-[11px] text-slate-500 font-medium">Enrolled with All-Access privileges</div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AutoPay Status</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {plans.filter(p => p.autopay_enabled !== false).length} / {plans.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Tiers with UPI AutoPay enabled</div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing Range</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {plans.length ? `₹${Math.min(...plans.map(p => p.price))} - ₹${Math.max(...plans.map(p => p.price))}` : '₹0'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Flexible Monthly to Annual passes</div>
        </div>
      </div>

      {/* ── Plans Cards Display ── */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading VIP membership plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No membership plans found. Click "Create New VIP Tier" to set one up.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isActive = plan.status === 'active';
            const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');
            const isAutoPay = plan.autopay_enabled !== false;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-7 border flex flex-col justify-between space-y-6 shadow-sm hover:shadow-lg transition relative ${
                  isPopular
                    ? 'border-2 border-indigo-600 shadow-indigo-100/50'
                    : 'border-slate-200'
                } ${!isActive ? 'opacity-70 bg-slate-50' : ''}`}
              >
                {/* Top Badge Tag */}
                {plan.badge && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between pt-1">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''} Pass
                        </span>

                        {isAutoPay ? (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                            AutoPay ON
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Manual Renewal
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-slate-900 mt-1.5">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">₹{plan.price.toLocaleString('en-IN')}</span>
                      {plan.original_price > plan.price && (
                        <span className="text-sm line-through text-slate-400 font-semibold">
                          ₹{plan.original_price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {plan.billing_interval}
                    </div>
                  </div>

                  {/* AutoPay Quick Switch */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isAutoPay ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">UPI AutoPay / e-Mandate</div>
                        <div className="text-[10px] text-slate-500">{isAutoPay ? 'Enabled for students' : 'Disabled for this tier'}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoPay(plan.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer border ${
                        isAutoPay
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isAutoPay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Active Subscribers Pill */}
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-500">Active Students:</span>
                    <span className="font-black text-indigo-600">{plan.active_subscribers || 0} Subscribed</span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Included Benefits:</div>
                    <div className="space-y-2 text-xs text-slate-700">
                      {plan.features?.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(plan.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                    }`}
                    title="Click to toggle status"
                  >
                    {isActive ? '● Live on Store' : '○ Archived'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit / Create Plan Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b101e] border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Crown className="w-4 h-4" /> VIP Scholar Pass Configuration
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Plan Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Plan Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Super Scholar Pass"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ribbon / Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. ⭐ Most Popular, 🔥 Best Value"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 7999"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Original MRP (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15999"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="36"
                    placeholder="e.g. 12"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* AutoPay / Recurring Mandate Configuration */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">UPI AutoPay & Recurring e-Mandate</h4>
                      <p className="text-[11px] text-slate-400">Allow students to enable seamless auto-renewals at checkout</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autopay_enabled}
                      onChange={(e) => setFormData({ ...formData, autopay_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {formData.autopay_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Renewal Frequency</label>
                      <select
                        value={formData.autopay_interval}
                        onChange={(e) => setFormData({ ...formData, autopay_interval: e.target.value })}
                        className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="monthly">Monthly Auto-Debit</option>
                        <option value="quarterly">Quarterly Auto-Debit</option>
                        <option value="semi-annual">Every 6 Months</option>
                        <option value="annual">Annual Renewal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">AutoPay Extra Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        placeholder="e.g. 5"
                        value={formData.autopay_discount_pct}
                        onChange={(e) => setFormData({ ...formData, autopay_discount_pct: e.target.value })}
                        className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Billing Subtext & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Interval Label</label>
                  <input
                    type="text"
                    placeholder="e.g. billed annually • Save 50% (₹666/mo)"
                    value={formData.billing_interval}
                    onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sort Order (1, 2, 3)</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Plan Description</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Complete 365-day all-access membership to every Class 11, 12, and CUET Commerce course."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium resize-none"
                />
              </div>

              {/* Dynamic Benefits / Features List */}
              <div className="space-y-3 bg-[#070b14] border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Plan Benefits & Bullet Points ({formData.features.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Benefit
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="e.g. Full CUET 2027 Mock Test Series + CBT Interface"
                        value={feat}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Switch */}
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-semibold text-slate-300">Plan Status:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formData.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Active / Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formData.status === 'inactive'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Inactive / Archived
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Saving Plan...' : (editingPlan ? 'Update Plan' : 'Publish Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
