import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Plus,
  Radio,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Trash2,
  Send,
  Search,
  Layers,
  ArrowRight,
  Shield,
  MessageSquare,
  Pin
} from 'lucide-react';

export function AdminCommunities() {
  const { toast } = useToast();
  const [communities, setCommunities] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // Create Community Form
  const [formData, setFormData] = useState({
    target_class: 'Class 12',
    class_id: '',
    name: '',
    description: '',
    badge: 'Official Batch',
    faculty_mentor: 'CA Manish Kalra',
    accent_color: 'bg-indigo-500',
    banner_url: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Add Student Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [submittingAddStudent, setSubmittingAddStudent] = useState(false);

  // Broadcast Live Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [commRes, classRes, studRes] = await Promise.all([
        apiFetch('/communities'),
        apiFetch('/public/academic-classes').catch(() => ({ classes: [] })),
        apiFetch('/admin/students').catch(() => ({ students: [] }))
      ]);

      if (commRes.success && commRes.communities) {
        setCommunities(commRes.communities);
        if (commRes.communities.length > 0) {
          setSelectedCommunity(commRes.communities[0]);
          loadCommunityDetails(commRes.communities[0].id);
        }
      }

      if (classRes.classes) {
        setAcademicClasses(classRes.classes);
      }

      if (studRes.students) {
        setAllStudents(studRes.students);
      }
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to load community management' });
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityDetails = async (commId, currentComm = null) => {
    const comm = currentComm || (communities && communities.find(c => c.id === commId)) || selectedCommunity;
    try {
      const [membersRes, postsRes] = await Promise.all([
        apiFetch(`/communities/${commId}/members`).catch(() => ({ success: false, members: [] })),
        apiFetch(`/communities/${commId}/posts`).catch(() => ({ success: false, posts: [] }))
      ]);

      let membersList = (membersRes && membersRes.success && Array.isArray(membersRes.members)) ? membersRes.members : [];

      if (membersList.length === 0 && allStudents && allStudents.length > 0 && comm) {
        const matching = allStudents
          .filter(s => (s.target_class === comm.target_class || s.academic_class === comm.target_class || (comm.target_class === 'Class 12' && (!s.target_class || s.target_class === 'Class 12'))))
          .map(s => ({
            id: 'stu_' + s.id,
            user_id: s.id,
            name: s.name || s.student_name || 'Student',
            email: s.email || s.phone || 'No email',
            phone: s.phone || '',
            role: 'student',
            target_class: s.target_class || comm.target_class,
            joined_at: s.created_at || new Date().toISOString()
          }));
        if (matching.length > 0) membersList = matching;
      }

      setCommunityMembers(membersList);
      if (postsRes && postsRes.success) setCommunityPosts(postsRes.posts || []);
    } catch (e) {
      console.error('Failed to load community details', e);
    }
  };

  const handleSelectCommunity = (c) => {
    setSelectedCommunity(c);
    loadCommunityDetails(c.id, c);
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.target_class) {
      toast({ type: 'error', message: 'Class and name are required' });
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await apiFetch('/communities', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        toast({ type: 'success', message: res.message || 'Class community created!' });
        setCreateModalOpen(false);
        setFormData({
          target_class: 'Class 12',
          class_id: '',
          name: '',
          description: '',
          badge: 'Official Batch',
          faculty_mentor: 'CA Manish Kalra',
          accent_color: 'bg-indigo-500',
          banner_url: ''
        });
        fetchInitialData();
      }
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to create community' });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCommunity) return;

    try {
      setSubmittingAddStudent(true);
      const res = await apiFetch(`/communities/${selectedCommunity.id}/add-student`, {
        method: 'POST',
        body: { student_id: selectedStudentId }
      });

      if (res.success) {
        toast({ type: 'success', message: res.message || 'Student added to class group!' });
        setAddStudentModalOpen(false);
        setSelectedStudentId('');
        loadCommunityDetails(selectedCommunity.id);
      }
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to add student' });
    } finally {
      setSubmittingAddStudent(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!selectedCommunity) return;

    try {
      setSubmittingBroadcast(true);
      const res = await apiFetch(`/communities/${selectedCommunity.id}/broadcast-live`, {
        method: 'POST',
        body: {
          title: broadcastTitle.trim() || '🔴 Live Class Alert',
          custom_message: broadcastMsg.trim() || 'Your live batch session is starting soon! Join the live room.'
        }
      });

      if (res.success) {
        toast({ type: 'success', message: 'Broadcast published to community feed & notifications!' });
        setBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastMsg('');
        loadCommunityDetails(selectedCommunity.id);
      }
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to send broadcast' });
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Class Community Administration</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Class Communities & Groups
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create class communities, add students to cohorts, and post live class updates & broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Make Community for Class</span>
          </button>
        </div>
      </div>

      {/* ── Communities Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {communities.map(c => {
          const isSelected = selectedCommunity?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => handleSelectCommunity(c)}
              className={`p-5 rounded-3xl border transition cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{c.icon}</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                  {c.target_class}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mb-1">{c.name}</h3>
              <p className="text-[11px] text-slate-500 line-clamp-2 mb-4 leading-relaxed">{c.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  {c.member_count || 0} Students
                </span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Selected Community Operations Panel ── */}
      {selectedCommunity && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{selectedCommunity.icon}</span>
                <h2 className="text-lg font-bold text-slate-900">{selectedCommunity.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  {selectedCommunity.target_class}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedCommunity.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAddStudentModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student to Group</span>
              </button>

              <button
                onClick={() => setBroadcastModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-200 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Broadcast Live Update</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Enrolled Students */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Enrolled Students ({communityMembers.length})
                </h3>
                <span className="text-[11px] text-slate-400">Auto-synced with class</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1 border border-slate-100 rounded-2xl p-3">
                {communityMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No students added yet.</p>
                ) : (
                  communityMembers.map(m => (
                    <div key={m.id || m.user_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {m.name ? m.name[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{m.name || 'Student'}</p>
                          <p className="text-[10px] text-slate-400">{m.email || m.phone || 'Enrolled Student'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.target_class && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {m.target_class}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Active Student
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Posts & Live Updates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Community Feed & Updates ({communityPosts.length})
                </h3>
                <button
                  onClick={() => setBroadcastModalOpen(true)}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  + Post Update
                </button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {communityPosts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center border border-slate-100 rounded-2xl">
                    No posts in feed yet.
                  </p>
                ) : (
                  communityPosts.map(p => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {p.post_type === 'live_class_update' && (
                            <Radio className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{p.title || p.author_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-normal">{p.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Make Community for Class ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Make Community for Class</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an official cohort group for a class where students receive updates and live class notices.
            </p>

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Academic Class *</label>
                <select
                  value={formData.target_class}
                  onChange={(e) => {
                    const val = e.target.value;
                    const defaultName = `${val} Commerce Cohort`;
                    setFormData({ ...formData, target_class: val, name: defaultName });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Class 12">Class 12 Commerce</option>
                  <option value="Class 11">Class 11 Commerce</option>
                  <option value="CUET">CUET Entrance Track</option>
                  <option value="CA Foundation">CA Foundation Track</option>
                  <option value="Class 10">Class 10 Foundation</option>
                  <option value="Class 9">Class 9 Foundation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Community Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 12 Commerce Achievers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Description of this batch community..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Mentor</label>
                  <input
                    type="text"
                    value={formData.faculty_mentor}
                    onChange={(e) => setFormData({ ...formData, faculty_mentor: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submittingCreate ? 'Creating...' : 'Create Class Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Student to Class Group ── */}
      {addStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Add Student to {selectedCommunity?.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select any registered student to add them directly into this class community group.
            </p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Search Student</label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 text-center">No students found.</p>
                  ) : (
                    filteredStudents.map(s => (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-slate-50 ${
                          selectedStudentId === s.id ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.email} • {s.target_class || 'Class 12'}</p>
                        </div>
                        <input
                          type="radio"
                          name="studentRadio"
                          checked={selectedStudentId === s.id}
                          onChange={() => setSelectedStudentId(s.id)}
                          className="text-indigo-600"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAddStudent || !selectedStudentId}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submittingAddStudent ? 'Adding...' : 'Add to Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Broadcast Live Class Update ── */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Broadcast Live Class Update
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Send an instant live class announcement & notification to all students in {selectedCommunity?.name}.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Broadcast Title</label>
                <input
                  type="text"
                  placeholder="e.g. 🔴 Accounts Live Revision Session Starting Now!"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message / Instructions</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Class is starting! Please join the live room now with your notebook."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBroadcast}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-200 cursor-pointer"
                >
                  {submittingBroadcast ? 'Broadcasting...' : 'Send Live Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
