import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/attendance')
      .then(res => {
        if (res.success) {
          setRecords(res.records);
          setSummary(res.summary);
        }
      })
      .catch(err => console.error('Fetch attendance error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Attendance Tracking</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Attendance logged for live lectures and proctored class sessions.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading attendance summary...</p>
        </div>
      ) : (
        <>
          {/* Subject Wise Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summary.map(s => (
              <div
                key={s.subject}
                className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-base">{s.subject}</h3>
                  <span className="text-2xl font-black text-indigo-600">{s.percentage}%</span>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${s.percentage}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Attended: <strong className="text-slate-800">{s.attended}</strong></span>
                  <span>Total Classes: <strong className="text-slate-800">{s.total}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Attendance Logs */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Session-by-Session Records</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Attendance Status</th>
                    <th className="pb-3 font-semibold">Remarks / Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 text-slate-600 font-mono">{r.class_date}</td>
                      <td className="py-3.5 font-bold text-slate-900">{r.subject}</td>
                      <td className="py-3.5">
                        {r.status === 'present' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
                            Present
                          </span>
                        ) : r.status === 'late' ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase text-[10px]">
                            Late
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase text-[10px]">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-500">{r.remarks || 'Standard live session'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
