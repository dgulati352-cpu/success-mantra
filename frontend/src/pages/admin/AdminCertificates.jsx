import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Plus,
  CheckCircle2,
  Search,
  ExternalLink,
  X,
  Share2,
  Edit3,
  Trash2,
  Copy,
  Printer,
  Calendar,
  Sparkles,
  Phone,
  User,
  BookOpen,
  FileText,
  Loader2,
  Eye,
  Check,
  UserCheck
} from 'lucide-react';
import { CertificateView } from '../../components/common/CertificateView';

export function AdminCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    certificate_code: '',
    student_name: 'Laura Bennett',
    student_email: '',
    student_phone: '',
    course_title: 'Class 12 Commerce Board Master Blueprint',
    target_class: 'Class 12 Commerce',
    subject: 'Accountancy & Business Studies',
    grade: 'A+ (Distinction 98%+)',
    citation_text: 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
    issue_date: '28 January 2026',
    director_name: 'C.A. Manish Kalra',
    director_title: 'Director',
    template_theme: 'gold_luxury'
  });

  const { success, error } = useToast();

  const fetchCertificates = () => {
    setLoading(true);
    apiFetch('/admin/certificates')
      .then(res => {
        if (res && res.success) {
          setCertificates(res.certificates || []);
        }
      })
      .catch(err => {
        console.error('Fetch certificates error:', err);
        error('Failed to load certificates from database.');
      })
      .finally(() => setLoading(false));
  };

  const fetchStudents = () => {
    apiFetch('/admin/students')
      .then(res => {
        if (res && res.success && Array.isArray(res.students)) {
          setStudentsList(res.students);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCertificates();
    fetchStudents();
  }, []);

  const openNewCertModal = () => {
    setIsEditing(false);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    setFormData({
      id: '',
      certificate_code: `SM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      student_name: '',
      student_email: '',
      student_phone: '',
      course_title: 'Class 12 Commerce Board Master Blueprint',
      target_class: 'Class 12 Commerce',
      subject: 'Accountancy & Business Studies',
      grade: 'A+ (Distinction 98%+)',
      citation_text: 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
      issue_date: todayStr,
      director_name: 'C.A. Manish Kalra',
      director_title: 'Director',
      template_theme: 'gold_luxury'
    });
    setEditorModalOpen(true);
  };

  const openEditCertModal = (cert) => {
    setIsEditing(true);
    setFormData({
      id: cert.id,
      certificate_code: cert.certificate_code,
      student_name: cert.student_name || '',
      student_email: cert.student_email || '',
      student_phone: cert.student_phone || '',
      course_title: cert.course_title || '',
      target_class: cert.target_class || 'Class 12 Commerce',
      subject: cert.subject || 'Commerce',
      grade: cert.grade || 'A+ (Distinction 98%+)',
      citation_text: cert.citation_text || 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
      issue_date: cert.issue_date || '28 January 2026',
      director_name: cert.director_name || 'C.A. Manish Kalra',
      director_title: cert.director_title || 'Director',
      template_theme: cert.template_theme || 'gold_luxury'
    });
    setEditorModalOpen(true);
  };

  const handleSelectRegisteredStudent = (studentId) => {
    if (!studentId) return;
    const st = studentsList.find(s => String(s.id) === String(studentId));
    if (!st) return;

    setFormData(prev => ({
      ...prev,
      student_name: st.name || prev.student_name,
      student_email: st.email || prev.student_email,
      student_phone: st.phone || st.profile?.phone || st.whatsapp || prev.student_phone,
      target_class: st.target_class || prev.target_class,
      course_title: st.target_class ? `${st.target_class} Master Blueprint Program` : prev.course_title
    }));
    success(`👤 Auto-filled student details & login phone for ${st.name}!`);
  };

  const handleSaveCertificate = async (e) => {
    e.preventDefault();
    if (!formData.student_name.trim()) {
      error('Please enter the student name.');
      return;
    }
    if (!formData.course_title.trim()) {
      error('Please enter the course title.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        const res = await apiFetch(`/admin/certificates/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          success('🎉 Certificate updated successfully in database!');
          setEditorModalOpen(false);
          fetchCertificates();
        } else {
          error(res?.message || 'Failed to update certificate.');
        }
      } else {
        const res = await apiFetch('/admin/certificates', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          success(res.message || '🎉 New Certificate successfully issued and saved to database!');
          setEditorModalOpen(false);
          fetchCertificates();
        } else {
          error(res?.message || 'Failed to issue certificate.');
        }
      }
    } catch (err) {
      error(err.message || 'Network error while saving certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (certId, certCode) => {
    if (!window.confirm(`Are you sure you want to revoke/delete certificate ${certCode}?`)) return;
    try {
      const res = await apiFetch(`/admin/certificates/${certId}`, { method: 'DELETE' });
      if (res && res.success) {
        success('Certificate removed from database.');
        fetchCertificates();
      } else {
        error(res?.message || 'Failed to delete certificate.');
      }
    } catch (err) {
      error('Failed to delete certificate.');
    }
  };

  const handleWhatsAppShare = (cert) => {
    let rawPhone = (cert.student_phone || '').replace(/[^0-9]/g, '');

    // Automatically resolve student registered phone from student database
    if (!rawPhone || rawPhone === '8755910352' || rawPhone === '918755910352') {
      const matched = studentsList.find(s =>
        (cert.student_email && s.email && s.email.toLowerCase() === cert.student_email.toLowerCase()) ||
        (cert.student_name && s.name && s.name.toLowerCase().trim() === cert.student_name.toLowerCase().trim())
      );
      if (matched && matched.phone) {
        rawPhone = String(matched.phone).replace(/[^0-9]/g, '');
      }
    }

    const phoneWithCountry = rawPhone ? (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone) : '';
    const verifyUrl = `https://www.camanishkalra.com/verify-certificate?code=${cert.certificate_code}`;

    const text = `🎓 *Official Certificate of Completion - Success Mantra*

Dear *${cert.student_name}*,

Congratulations! Your official Certificate of Completion for *${cert.course_title}* has been issued by *CA Manish Kalra*.

🏆 *Award / Grade*: ${cert.grade || 'A+ (Distinction)'}
📜 *Certificate ID*: *${cert.certificate_code}*
📅 *Issue Date*: ${cert.issue_date}

🔗 *View & Download Verified Certificate*:
${verifyUrl}

Wishing you tremendous success in your board exams and professional career!

Best Regards,
*CA Manish Kalra*
Senior Chartered Accountant
Success Mantra Commerce Academy`;

    const waUrl = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };


  const handleCopyVerificationLink = (code) => {
    const url = `https://www.camanishkalra.com/verify-certificate?code=${code}`;
    navigator.clipboard.writeText(url);
    success('📋 Verification link copied to clipboard!');
  };

  const filteredCertificates = certificates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.student_name && c.student_name.toLowerCase().includes(q)) ||
      (c.certificate_code && c.certificate_code.toLowerCase().includes(q)) ||
      (c.course_title && c.course_title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Verified Certificate Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Certificate Issuance & WhatsApp Share</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Create, edit, customize, and directly dispatch verified gold completion certificates to students via WhatsApp or Email.
          </p>
        </div>

        <button
          onClick={openNewCertModal}
          className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Certificate</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name, certificate ID, course..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-700">
            {certificates.length} Total Issued
          </span>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading certificates database...</p>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Award className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Certificates Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search ? 'Try clearing your search term.' : 'Click "+ Issue New Certificate" to create and share your first student certificate.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Certificate ID</th>
                  <th className="py-3.5 px-4">Student Recipient</th>
                  <th className="py-3.5 px-4">Course & Grade</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.map(cert => (
                  <tr key={cert.id || cert.certificate_code} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]">
                          {cert.certificate_code}
                        </span>
                        <button
                          onClick={() => handleCopyVerificationLink(cert.certificate_code)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                          title="Copy Public Verification Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{cert.student_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        {cert.student_phone && (
                          <span className="flex items-center gap-0.5 text-emerald-600 font-medium font-mono">
                            <Phone className="w-2.5 h-2.5" /> {cert.student_phone}
                          </span>
                        )}
                        {cert.student_email && <span>{cert.student_email}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{cert.course_title}</div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold mt-0.5">
                        {cert.grade || 'A+ Distinction'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium text-[11px]">
                      {cert.issue_date || 'Recent'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Verified
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* WhatsApp Direct Share Button */}
                        <button
                          onClick={() => handleWhatsAppShare(cert)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-sm transition flex items-center gap-1 cursor-pointer"
                          title={`Direct Share to Student's WhatsApp (${cert.student_phone || 'No phone set'})`}
                        >
                          <Share2 className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Preview / View Button */}
                        <button
                          onClick={() => {
                            setSelectedCert(cert);
                            setPreviewModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="View Certificate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditCertModal(cert)}
                          className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition cursor-pointer"
                          title="Edit Certificate Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCertificate(cert.id, cert.certificate_code)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          title="Revoke / Delete Certificate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WYSIWYG CERTIFICATE EDITOR & ISSUER MODAL (Live Preview + Edit Form)     */}
      {/* ========================================================================= */}
      {editorModalOpen && (
        <div
          onClick={() => setEditorModalOpen(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-4 sm:p-6 space-y-4 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {isEditing ? 'Edit Student Certificate' : 'Issue New Completion Certificate'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live WYSIWYG editor • Real-time preview • Direct WhatsApp delivery to student
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditorModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen: Left = Form Inputs | Right = Live Certificate Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Form Fields */}
              <form onSubmit={handleSaveCertificate} className="lg:col-span-5 space-y-3 text-xs">
                
                {/* Auto-Fill from Registered Student Account Dropdown */}
                {studentsList.length > 0 && !isEditing && (
                  <div className="bg-slate-950 p-2.5 rounded-2xl border border-indigo-500/30 space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Auto-Fill From Registered Student (Login Phone)
                    </label>
                    <select
                      onChange={e => handleSelectRegisteredStudent(e.target.value)}
                      defaultValue=""
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Registered Student --</option>
                      {studentsList.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.phone || 'No phone'} • {st.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Student Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_name}
                    onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                    placeholder="e.g. Laura Bennett"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* WhatsApp Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      Student WhatsApp No. (Login Phone) *
                    </label>
                    <input
                      type="text"
                      value={formData.student_phone}
                      onChange={e => setFormData({ ...formData, student_phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono font-bold focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Student Email
                    </label>
                    <input
                      type="email"
                      value={formData.student_email}
                      onChange={e => setFormData({ ...formData, student_email: e.target.value })}
                      placeholder="student@example.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Course Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Course / Program Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.course_title}
                    onChange={e => setFormData({ ...formData, course_title: e.target.value })}
                    placeholder="e.g. Class 12 Commerce Board Master Blueprint"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Grade / Award & Issue Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      Grade / Distinction
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="A+ (Distinction 98%+)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Issue Date
                    </label>
                    <input
                      type="text"
                      value={formData.issue_date}
                      onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                      placeholder="28 January 2026"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Citation / Completion Description Text */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Citation / Description Text
                  </label>
                  <textarea
                    rows={3}
                    value={formData.citation_text}
                    onChange={e => setFormData({ ...formData, citation_text: e.target.value })}
                    placeholder="For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth."
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-indigo-500 focus:outline-none leading-relaxed"
                  ></textarea>
                </div>

                {/* Director Name */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Director Name
                    </label>
                    <input
                      type="text"
                      value={formData.director_name}
                      onChange={e => setFormData({ ...formData, director_name: e.target.value })}
                      placeholder="C.A. Manish Kalra"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Director Title
                    </label>
                    <input
                      type="text"
                      value={formData.director_title}
                      onChange={e => setFormData({ ...formData, director_title: e.target.value })}
                      placeholder="Director"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit / WhatsApp Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(formData)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    title={`Send Directly to Student's WhatsApp (${formData.student_phone || 'Enter Phone Above'})`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send to Student's WhatsApp</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Save Changes' : 'Issue Certificate'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Visual Certificate Preview */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Live Visual Certificate Preview
                </span>
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                  <CertificateView certificate={formData} />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CERTIFICATE FULLSCREEN PREVIEW & PRINT MODAL                              */}
      {/* ========================================================================= */}
      {previewModalOpen && selectedCert && (
        <div
          onClick={() => setPreviewModalOpen(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 space-y-4 text-white shadow-2xl relative max-h-[95vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Official Certificate — {selectedCert.student_name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWhatsAppShare(selectedCert)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share to Student's WhatsApp</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Render Certificate */}
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <CertificateView certificate={selectedCert} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
