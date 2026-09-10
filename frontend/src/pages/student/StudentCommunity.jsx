import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  Radio,
  MessageSquare,
  Plus,
  CheckCircle2,
  Bell,
  ArrowRight,
  BookOpen,
  Sparkles,
  Send,
  CornerDownRight,
  Pin,
  Calendar,
  Clock,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Play,
  X
} from 'lucide-react';

export function StudentCommunity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [communities, setCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [liveClasses, setLiveClasses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'live', 'members'

  // Post creation modal & Cloudflare R2 attachment
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState('image');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Cloudflare Stream Live Modal Player
  const [cloudflareStreamModal, setCloudflareStreamModal] = useState(null);

  // Comment state
  const [replyPostId, setReplyPostId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // 1. Fetch all communities on mount
  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/communities');
      if (res.success && res.communities) {
        setCommunities(res.communities);

        const urlCommId = searchParams.get('id');
        let selected = null;
        if (urlCommId) {
          selected = res.communities.find(c => c.id === urlCommId);
        }
        if (!selected && user?.target_class) {
          selected = res.communities.find(c =>
            c.target_class.toLowerCase().includes(user.target_class.toLowerCase()) ||
            user.target_class.toLowerCase().includes(c.target_class.toLowerCase())
          );
        }
        if (!selected) {
          selected = res.communities[0];
        }

        if (selected) {
          setActiveCommunity(selected);
          loadCommunityData(selected.id);
        }
      }
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to load communities' });
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityData = async (commId) => {
    try {
      // 1. Details & Live classes
      const detailRes = await apiFetch(`/communities/${commId}`);
      if (detailRes.success) {
        if (detailRes.community) setActiveCommunity(detailRes.community);
        setLiveClasses(detailRes.live_classes || []);
      }

      // 2. Feed posts
      const postsRes = await apiFetch(`/communities/${commId}/posts`);
      if (postsRes.success) {
        setPosts(postsRes.posts || []);
      }

      // 3. Members
      const membersRes = await apiFetch(`/communities/${commId}/members`);
      if (membersRes.success) {
        setMembers(membersRes.members || []);
      }
    } catch (err) {
      console.error('Load community data error:', err);
    }
  };

  const handleSelectCommunity = (comm) => {
    setActiveCommunity(comm);
    setSearchParams({ id: comm.id });
    loadCommunityData(comm.id);
  };

  const handleJoinToggle = async () => {
    if (!activeCommunity) return;
    try {
      if (activeCommunity.is_member) {
        await apiFetch(`/communities/${activeCommunity.id}/leave`, { method: 'POST' });
        toast({ type: 'info', message: `Left ${activeCommunity.name}` });
      } else {
        await apiFetch(`/communities/${activeCommunity.id}/join`, { method: 'POST' });
        toast({ type: 'success', message: `Joined ${activeCommunity.name}! 🎉` });
      }
      fetchCommunities();
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Action failed' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024 * 1024) {
      toast({ type: 'error', message: 'Attachment file must be under 250MB (10x limit)' });
      return;
    }

    try {
      setUploadingAttachment(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await apiFetch('/communities/upload-attachment', {
            method: 'POST',
            body: {
              base64_data: reader.result,
              file_name: file.name,
              mime_type: file.type
            }
          });
          if (res.success && res.url) {
            setAttachmentUrl(res.url);
            setAttachmentType(file.type.includes('pdf') ? 'pdf' : 'image');
            toast({ type: 'success', message: 'Attachment uploaded to Cloudflare R2!' });
          }
        } catch (uploadErr) {
          toast({ type: 'error', message: uploadErr.message || 'Failed to upload attachment' });
        } finally {
          setUploadingAttachment(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingAttachment(false);
      toast({ type: 'error', message: 'Failed reading file' });
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || !activeCommunity) return;

    try {
      setSubmittingPost(true);
      await apiFetch(`/communities/${activeCommunity.id}/posts`, {
        method: 'POST',
        body: {
          title: postTitle.trim() || null,
          content: postContent.trim(),
          post_type: 'doubt',
          attachment_url: attachmentUrl || null,
          attachment_type: attachmentType
        }
      });
      toast({ type: 'success', message: 'Doubt / Question posted to class community!' });
      setPostTitle('');
      setPostContent('');
      setAttachmentUrl('');
      setCreatePostOpen(false);
      loadCommunityData(activeCommunity.id);
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to publish post' });
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAddReply = async (postId) => {
    if (!replyContent.trim() || !activeCommunity) return;

    try {
      setSubmittingReply(true);
      await apiFetch(`/communities/${activeCommunity.id}/posts/${postId}/comments`, {
        method: 'POST',
        body: { content: replyContent.trim() }
      });
      toast({ type: 'success', message: 'Reply posted!' });
      setReplyContent('');
      setReplyPostId(null);
      loadCommunityData(activeCommunity.id);
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to post reply' });
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading && !activeCommunity) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading your class community...</p>
      </div>
    );
  }

  const liveNow = liveClasses.filter(c => c.status === 'live');
  const upcoming = liveClasses.filter(c => c.status !== 'live');

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header & Class Community Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Class Community Hub</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {activeCommunity ? activeCommunity.name : 'Class Community'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Batch-specific updates, upcoming live classes, study announcements & doubt solving.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Class Switcher Dropdown */}
          <div className="relative">
            <select
              value={activeCommunity?.id || ''}
              onChange={(e) => {
                const found = communities.find(c => c.id === e.target.value);
                if (found) handleSelectCommunity(found);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer pr-9"
            >
              {communities.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name} ({c.target_class})
                </option>
              ))}
            </select>
          </div>

          {activeCommunity && (
            <button
              onClick={handleJoinToggle}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                activeCommunity.is_member
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {activeCommunity.is_member ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Enrolled Member</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Join Class Group</span>
                </>
              )}
            </button>
          )}

          {activeCommunity?.is_member && (
            <button
              onClick={() => setCreatePostOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ask Doubt / Post</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Community Banner & Mentor Card ── */}
      {activeCommunity && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 text-white shadow-lg">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-300 text-[11px] font-bold mb-3 border border-white/10">
              <span>{activeCommunity.icon}</span>
              <span>{activeCommunity.target_class} Official Cohort</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300 font-semibold">{activeCommunity.badge}</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              {activeCommunity.name}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-6">
              {activeCommunity.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400 flex items-center justify-center font-bold text-white text-xs">
                  CA
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Faculty Mentor</p>
                  <p className="font-bold text-white">{activeCommunity.faculty_mentor || 'CA Manish Kalra'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Class Members</p>
                <p className="font-bold text-white">{activeCommunity.member_count || members.length} Students</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Live Classes</p>
                <p className="font-bold text-emerald-400">
                  {liveNow.length > 0 ? `${liveNow.length} Live Stream Active` : `${upcoming.length} Upcoming Batches`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Live Stream Alert Bar (if class is live right now) ── */}
      {liveNow.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wide">
                  CLASS LIVE NOW
                </span>
                <span className="text-xs font-bold text-slate-900">{liveNow[0].title}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Instructor: {liveNow[0].faculty_name || 'CA Manish Kalra'} • Subject: {liveNow[0].subject}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {liveNow[0].cloudflare_iframe_url && (
              <button
                type="button"
                onClick={() => setCloudflareStreamModal(liveNow[0])}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Watch Stream</span>
              </button>
            )}
            <Link
              to={`/student/live?roomId=${liveNow[0].id}`}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-rose-200 transition shrink-0"
            >
              <span>Join Classroom</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'feed'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Class Updates & Feed ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'live'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live Classes for {activeCommunity?.target_class} ({liveClasses.length})</span>
          {liveNow.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Classmates ({members.length})</span>
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tab Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* TAB 1: Updates & Feed */}
          {activeTab === 'feed' && (
            <>
              {posts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No updates or questions yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Be the first to ask a study doubt or post in the {activeCommunity?.name} group.
                  </p>
                  {activeCommunity?.is_member && (
                    <button
                      onClick={() => setCreatePostOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Now</span>
                    </button>
                  )}
                </div>
              ) : (
                posts.map(post => {
                  const isFaculty = post.author_role === 'faculty' || post.author_role === 'admin';
                  const isLiveUpdate = post.post_type === 'live_class_update';

                  return (
                    <div
                      key={post.id}
                      className={`p-6 rounded-3xl bg-white border transition shadow-sm ${
                        post.is_pinned
                          ? 'border-amber-300/80 bg-amber-50/20'
                          : isLiveUpdate
                            ? 'border-rose-200 bg-rose-50/10'
                            : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isFaculty ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {post.author_avatar ? (
                              <img src={post.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              post.author_name ? post.author_name[0].toUpperCase() : 'M'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{post.author_name}</span>
                              {isFaculty && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                  {post.author_role === 'faculty' ? 'Instructor' : 'Admin'}
                                </span>
                              )}
                              {isLiveUpdate && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                                  Live Class Alert
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(post.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {post.is_pinned === 1 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                      </div>

                      {/* Post Content */}
                      {post.title && (
                        <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                          {post.title}
                        </h4>
                      )}
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-4">
                        {post.content}
                      </p>

                      {/* Cloudflare Attachment Preview */}
                      {post.attachment_url && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                          {post.attachment_type === 'pdf' ? (
                            <a
                              href={post.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3.5 flex items-center justify-between hover:bg-slate-100 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">Attached Study PDF (Cloudflare R2)</p>
                                  <p className="text-[10px] text-slate-400">Click to open or download document</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </a>
                          ) : (
                            <a
                              href={post.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative cursor-zoom-in"
                            >
                              <img
                                src={post.attachment_url}
                                alt="Cloudflare Attachment"
                                className="max-h-72 w-full object-cover rounded-2xl group-hover:opacity-95 transition"
                              />
                              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-slate-900/70 text-[10px] text-white backdrop-blur-sm">
                                Cloudflare R2 Media
                              </div>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Live Class Link if attached */}
                      {post.live_class_id && (
                        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                            <Radio className="w-4 h-4 text-rose-600" />
                            <span>Linked Session: {post.live_class_title || 'Interactive Live Stream'}</span>
                          </div>
                          <Link
                            to={`/student/live?roomId=${post.live_class_id}`}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition"
                          >
                            Open Class
                          </Link>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <button
                          onClick={() => setReplyPostId(replyPostId === post.id ? null : post.id)}
                          className="inline-flex items-center gap-1.5 hover:text-indigo-600 font-bold transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{post.comments_count || 0} Replies</span>
                        </button>
                        <button
                          onClick={() => setReplyPostId(post.id)}
                          className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                        >
                          Write Reply
                        </button>
                      </div>

                      {/* Comments Thread */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100/80 space-y-2.5">
                          {post.comments.map(c => (
                            <div key={c.id} className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl text-xs">
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{c.author_name}</span>
                                  {(c.author_role === 'faculty' || c.author_role === 'admin') && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                                      Instructor
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-700 mt-0.5 text-xs leading-normal">{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Box */}
                      {replyPostId === post.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Write your answer or feedback..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddReply(post.id); }}
                            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleAddReply(post.id)}
                            disabled={submittingReply || !replyContent.trim()}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: Live Classes */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {liveClasses.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                  <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No Live Classes Scheduled</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Interactive classroom sessions for {activeCommunity?.target_class} will be posted here.
                  </p>
                </div>
              ) : (
                liveClasses.map(lc => {
                  const isLive = lc.status === 'live';
                  return (
                    <div
                      key={lc.id}
                      className={`p-6 rounded-3xl bg-white border transition shadow-sm ${
                        isLive ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLive ? 'bg-rose-600 text-white' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {isLive ? '🔴 LIVE NOW' : 'SCHEDULED BATCH'}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(lc.start_time).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">{lc.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Instructor: {lc.faculty_name || 'Faculty'} • Course: {lc.course_title || activeCommunity?.target_class}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {lc.cloudflare_iframe_url && (
                            <button
                              type="button"
                              onClick={() => setCloudflareStreamModal(lc)}
                              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>Cloudflare Stream</span>
                            </button>
                          )}
                          <Link
                            to={`/student/live?roomId=${lc.id}`}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition shrink-0 ${
                              isLive
                                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            <span>{isLive ? 'Join Live Room' : 'View Session'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Classmates */}
          {activeTab === 'members' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Enrolled Students in {activeCommunity?.target_class} ({members.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {members.map(m => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {m.name ? m.name[0].toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{m.name}</p>
                          {(m.role === 'faculty' || m.role === 'admin') && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                              Instructor
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{m.school || m.city || 'Success Mantra Student'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Community Widgets */}
        <div className="space-y-6">
          {/* Quick Info Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Information</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target Academic Class</span>
                <span className="font-bold text-slate-800">{activeCommunity?.target_class}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Faculty Mentor</span>
                <span className="font-bold text-slate-800">{activeCommunity?.faculty_mentor || 'CA Manish Kalra'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Live Sessions</span>
                <span className="font-bold text-emerald-600">{liveClasses.length} Scheduled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Your Status</span>
                <span className="font-bold text-indigo-600">
                  {activeCommunity?.is_member ? 'Active Member' : 'Not Joined'}
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Community Guidelines</span>
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-slate-500">
              <li>Keep discussions strictly academic and related to board / exam prep.</li>
              <li>Live class links and timing changes will be posted here in real-time.</li>
              <li>Ask doubt questions clearly and help peers with answers.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Create Doubt / Post Modal ── */}
      {createPostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Ask Doubt in {activeCommunity?.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your question will be visible to your classmates and faculty mentor.
            </p>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question / Doubt Title</label>
                <input
                  type="text"
                  placeholder="e.g. Question on Partnership Accounting goodwill valuation"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details & Problem Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain where you are getting stuck or paste the question text..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cloudflare R2 Attachment Uploader */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attach Photo or Document (Cloudflare R2)</span>
                  </span>
                  <input
                    type="file"
                    id="post-file-input"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="post-file-input"
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-[11px] font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Choose File</span>
                  </label>
                </div>

                {uploadingAttachment && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium py-1 animate-pulse">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading attachment directly to Cloudflare R2...</span>
                  </div>
                )}

                {attachmentUrl && (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <div className="flex items-center gap-2 truncate">
                      {attachmentType === 'pdf' ? (
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span className="truncate font-medium">Attachment ready (Cloudflare R2 verified)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('')}
                      className="text-emerald-700 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatePostOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost || uploadingAttachment}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submittingPost ? 'Posting...' : 'Publish Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cloudflare Stream Video Modal Player ── */}
      {cloudflareStreamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wider">
                  CLOUDFLARE STREAM
                </span>
                <h3 className="text-sm font-bold truncate">{cloudflareStreamModal.title}</h3>
              </div>
              <button
                onClick={() => setCloudflareStreamModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {cloudflareStreamModal.cloudflare_iframe_url ? (
                <iframe
                  src={cloudflareStreamModal.cloudflare_iframe_url}
                  title={cloudflareStreamModal.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Play className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">Live stream ready</p>
                  <p className="text-xs">Stream URL: {cloudflareStreamModal.cloudflare_hls_url || 'Connecting to Cloudflare Stream CDN...'}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Instructor: <strong className="text-white">{cloudflareStreamModal.faculty_name || 'Faculty'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to={`/student/live?roomId=${cloudflareStreamModal.id}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition"
                >
                  Open Full Interactive Room
                </Link>
                <button
                  onClick={() => setCloudflareStreamModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
