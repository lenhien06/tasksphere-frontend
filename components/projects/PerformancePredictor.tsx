"use client";

import { useState, useEffect } from "react";
import { Users, Search, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { UserService } from "@/app/services/user.service";

interface PerformancePredictorProps {
  projectId: string;
}

interface Member {
  id: string;
  name: string;
}

interface PredictionResult {
  employeeId: string;
  predictedPerformanceScore: number;
  trend: string;
  errorMessage?: string;
}

export default function PerformancePredictor({ projectId }: PerformancePredictorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    ProjectMemberService.getMembers(projectId)
      .then((list) => {
        const parsed = list.map((m) => ({ id: m.user.id.toString(), name: m.user.fullName || m.user.email }));
        setMembers(parsed);
        if (parsed.length > 0) {
          setSelectedUserId(parsed[0].id);
        }
      })
      .catch(() => {});
  }, [projectId]);

  const handlePredict = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await UserService.getPerformancePrediction(selectedUserId);
      if (res.trend === 'Error' || res.errorMessage) {
        setError(res.errorMessage || "Failed to predict performance.");
      } else {
        setResult(res);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load prediction from backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[1.8rem] font-black tracking-tight text-slate-950">AI Performance Predictor</h2>
            <p className="mt-2 text-base text-slate-600">
              Dự đoán điểm số và xu hướng (nguy cơ nghỉ việc/burnout) của nhân viên dựa trên lượng công việc và số lần trễ hạn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {members.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-12 appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-indigo-400"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 flex items-center text-sm font-medium text-slate-400">
                  Loading members...
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePredict}
              disabled={loading || !selectedUserId}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-base font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Dự đoán bằng AI
            </button>
          </div>
        </div>

        <div className="pt-6">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-6">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-8 py-16 text-center">
              <p className="text-lg font-semibold text-slate-900">Hãy chọn một thành viên và bấm Dự đoán</p>
              <p className="mt-2 text-base text-slate-600">Hệ thống AI sẽ tự động phân tích Worklog và Task của nhân sự này.</p>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}

          {result && (
            <div className="grid gap-6 xl:grid-cols-10">
              <div className="xl:col-span-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 h-full flex flex-col justify-center items-center text-center">
                   <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Điểm số hiệu suất dự đoán</h3>
                   <div className={`relative flex items-center justify-center w-48 h-48 rounded-full border-8 mb-4 ${result.trend === 'Good' ? 'border-emerald-200 bg-white' : 'border-rose-200 bg-white'}`}>
                      <span className={`text-5xl font-black ${result.trend === 'Good' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {result.predictedPerformanceScore}
                      </span>
                   </div>
                   <p className="text-slate-500 max-w-md mt-4">
                     Mô hình Regression đã phân tích tỷ lệ hoàn thành công việc và số lần giao nộp trễ hạn (late tasks) để đưa ra dự đoán.
                   </p>
                </div>
              </div>
              <div className="xl:col-span-4">
                <div className={`rounded-xl border px-6 py-6 h-full ${result.trend === 'Good' ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${result.trend === 'Good' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      {result.trend === 'Good' ? <TrendingUp className="h-6 w-6 text-emerald-600" /> : <TrendingUp className="h-6 w-6 text-rose-600 rotate-180" />}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-950">Xu hướng</h3>
                  </div>
                  
                  {result.trend === 'Good' ? (
                    <div className="space-y-4 text-slate-700 leading-relaxed text-base">
                      <p className="font-semibold text-emerald-800">Hiệu suất Đang Tăng/Ổn định</p>
                      <p>Hệ thống AI không phát hiện bất kỳ dấu hiệu bất thường nào về mặt hiệu suất. Nhân sự này đang hoàn thành tốt khối lượng công việc, tỷ lệ trễ hạn ở mức an toàn.</p>
                      <p className="text-sm bg-white p-3 rounded-lg border border-emerald-100 text-emerald-700">Mức độ rủi ro nghỉ việc: <strong>Thấp</strong></p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-slate-700 leading-relaxed text-base">
                      <p className="font-semibold text-rose-800">Hiệu suất Giảm / Nguy cơ cao</p>
                      <p>Mô hình phát hiện tỷ lệ trễ hạn cao hoặc số lượng giờ làm không tương xứng với task hoàn thành. Điều này cho thấy dấu hiệu quá tải hoặc mất động lực.</p>
                      <p className="text-sm bg-white p-3 rounded-lg border border-rose-100 text-rose-700">Mức độ rủi ro nghỉ việc: <strong>Cảnh báo đỏ</strong></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
