"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Search, Loader2, TrendingUp, AlertTriangle, ShieldAlert, Activity, Cpu, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { UserService, PerformancePredictionResult } from "@/app/services/user.service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformancePredictorProps {
  projectId: string;
}

interface Member {
  id: string;
  name: string;
}

export default function PerformancePredictor({ projectId }: PerformancePredictorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformancePredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState<number>(500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const updateWidth = () => {
      const w = containerRef.current?.getBoundingClientRect().width || 500;
      if (w > 0) setChartWidth(w);
    };
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [mounted]);

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

  const getTrendColor = (trend: string) => {
    switch(trend) {
      case 'Excellent': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Good': return 'text-teal-600 bg-teal-50 border-teal-200';
      case 'Stable': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (['Excellent', 'Good', 'Stable'].includes(trend)) {
      return <TrendingUp className="h-6 w-6" />;
    }
    return <TrendingUp className="h-6 w-6 rotate-180" />;
  };

  // Mock data for the chart if history is available
  const chartData = result?.history ? result.history.map((score, index) => ({
    name: `Sprint -${result.history.length - 1 - index}`,
    score: score
  })) : [];

  // Override the last sprint name to 'Current'
  if (chartData.length > 0) {
    chartData[chartData.length - 1].name = 'Current';
  }

  return (
    <div className="space-y-6">
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Cpu className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-[1.8rem] font-black tracking-tight text-slate-950">AI Analysis & Risk Prediction</h2>
            </div>
            <p className="mt-2 text-base text-slate-600 pl-11">
              Phân tích hiệu suất nâng cao, dự đoán rủi ro kiệt sức/nghỉ việc bằng Machine Learning.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {members.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-12 appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-base font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              Phân tích ngay
            </button>
          </div>
        </div>

        <div className="pt-6">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-6 animate-in fade-in">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-8 py-20 text-center animate-in fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm mb-4">
                <Cpu className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-900">Chưa có dữ liệu phân tích</p>
              <p className="mt-2 text-base text-slate-500 max-w-md mx-auto">Chọn một thành viên trong dự án và hệ thống AI sẽ trích xuất insight từ dữ liệu lịch sử làm việc.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 animate-in fade-in">
              <div className="relative flex items-center justify-center h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                <Cpu className="h-8 w-8 text-indigo-600 animate-pulse" />
              </div>
              <p className="mt-6 text-lg font-medium text-slate-600 animate-pulse">AI đang phân tích dữ liệu...</p>
            </div>
          )}

          {result && (
            <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Top Overview Cards */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                       <span className="text-xs font-semibold text-slate-600">Độ tin cậy: {Math.round(result.confidence * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Health Score tổng hợp</h3>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                     <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                            <circle cx="64" cy="64" r="56" fill="transparent" 
                                stroke={result.healthScore >= 70 ? '#10b981' : result.healthScore >= 50 ? '#f59e0b' : '#ef4444'} 
                                strokeWidth="12" 
                                strokeDasharray="351.8" 
                                strokeDashoffset={351.8 - (351.8 * result.healthScore) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black tracking-tighter text-slate-900">{result.healthScore}</span>
                        </div>
                     </div>
                     
                     <div className={`mt-6 px-4 py-1.5 rounded-full border font-bold text-sm flex items-center gap-2 ${getTrendColor(result.trend)}`}>
                        {getTrendIcon(result.trend)}
                        {result.trend.toUpperCase()}
                     </div>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                            <h3 className="font-bold text-slate-900">Biểu đồ xu hướng hiệu suất (5 kỳ gần nhất)</h3>
                        </div>
                        <span className="text-sm font-medium text-slate-500">Mô hình AI Random Forest</span>
                    </div>
                    <div ref={containerRef} className="h-[200px] w-full">
                       {mounted && chartData.length > 0 ? (
                          <AreaChart width={chartWidth} height={200} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                            />
                            <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                          </AreaChart>
                       ) : (
                         <div className="h-full w-full bg-slate-50 rounded-lg animate-pulse" />
                       )}
                     </div>
                 </div>
              </div>

              {/* Attrition Risk & Features */}
              <div className="lg:col-span-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                 
                 {/* Attrition Risk */}
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldAlert className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Rủi ro nghỉ việc / Burnout</h3>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-5xl font-black tracking-tight text-slate-900">
                                {Math.round(result.attritionProbability * 100)}<span className="text-2xl text-slate-500">%</span>
                            </span>
                            <span className={`text-sm font-bold px-2 py-1 rounded ${result.attritionProbability > 0.6 ? 'bg-rose-100 text-rose-700' : result.attritionProbability > 0.3 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {result.attritionProbability > 0.6 ? 'Nguy cơ cao' : result.attritionProbability > 0.3 ? 'Cần chú ý' : 'An toàn'}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 mt-4 overflow-hidden">
                           <div 
                             className={`h-3 rounded-full transition-all duration-1000 ${result.attritionProbability > 0.6 ? 'bg-rose-500' : result.attritionProbability > 0.3 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                             style={{ width: `${result.attritionProbability * 100}%` }}
                           ></div>
                        </div>
                        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                           Xác suất nhân sự gặp vấn đề burnout hoặc có nguy cơ rời dự án dựa trên lịch sử hoạt động và áp lực công việc.
                        </p>
                    </div>
                 </div>

                 {/* Top Factors & Root Causes */}
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-900">Yếu tố ảnh hưởng (AI Features)</h3>
                            </div>
                            <ul className="space-y-3">
                                {result.topContributingFactors?.map((factor, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                        <div className="mt-0.5 rounded-full bg-indigo-100 p-1">
                                            <Info className="h-3.5 w-3.5 text-indigo-600" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{factor}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Search className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-900">Phân tích nguyên nhân (Root Causes)</h3>
                            </div>
                            <ul className="space-y-3">
                                {result.rootCauses?.map((cause, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                        <div className="mt-0.5 rounded-full bg-rose-100 p-1">
                                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{cause}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                 </div>

                 {/* Recommendations */}
                 <div className="lg:col-span-12 rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Đề xuất hành động từ AI</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {result.recommendations?.map((rec, i) => (
                            <div key={i} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                                    {i + 1}
                                </div>
                                <p className="text-sm font-medium text-slate-700 mt-1">{rec}</p>
                            </div>
                        ))}
                    </div>
                 </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
