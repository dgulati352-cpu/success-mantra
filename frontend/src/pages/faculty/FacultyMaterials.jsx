import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { FileText, Plus, Upload, Download, CheckCircle2, X } from 'lucide-react';

export function FacultyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    course_id: 1,
    file_type: 'pdf',
    file_url: '/uploads/materials/new_study_kit.pdf',
    file_size: '4.2 MB',
    access_level: 'enrolled'
  });

  const { success, error } = useToast();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/student/materials'),
      apiFetch('/faculty/courses')
    ])
      .then(([matRes, courseRes]) => {
        if (matRes.success) setMaterials(matRes.materials);
        if (courseRes.success) setCourses(courseRes.courses);
      })
      .catch(err => console.error('Fetch materials error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/faculty/materials', {
        method: 'POST',
        body: JSON.stringify(newMaterial)
      });
      if (res.success) {
        success(res.message);
        setUploadModalOpen(false);
        fetchData();
      }
    } catch (err) {
      error(err.message || 'Failed to upload material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Study Materials & Notes Desk</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload chapter handbooks, formula cheat sheets, and solved board question banks.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Upload Study Material
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading materials...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map(mat => (
            <div
              key={mat.id}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                    {mat.file_type} • {mat.file_size || '3.8 MB'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-xs">{mat.course_title}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">{mat.title}</h3>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
                Published
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Upload New Study Material</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 12 Cash Flow Statement Master Guide"
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assign to Course</label>
                <select
                  value={newMaterial.course_id}
                  onChange={e => setNewMaterial({ ...newMaterial, course_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">Choose PDF / PPT / Handout File</div>
                <div className="text-[10px] text-slate-400">Auto-compressed for fast student download</div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Uploading...' : 'Publish to Student LMS'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
