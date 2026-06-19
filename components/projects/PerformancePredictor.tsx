"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { PerformancePredictionResult, UserService } from "@/app/services/user.service";

interface PerformancePredictorProps {
  projectId: string;
}

interface Member {
  id: string;
  name: string;
}

const trendLabelMap: Record<string, string> = {
  Excellent: "Xuất sắc",
  Good: "Tốt",
  Stable: "Ổn định",
  Warning: "Cần chú ý",
  Critical: "Nguy cấp",
};

const textTranslations: Array<[RegExp, string]> = [
  [/High Late Task Rate \(\+(\d+)%\)/i, "Tỷ lệ task trễ hạn cao (+$1%)"],
  [/Low Task Completion Rate \(\+(\d+)%\)/i, "Tỷ lệ hoàn thành task thấp (+$1%)"],
  [/Excessive Working Hours \(\+(\d+)%\)/i, "Thời gian làm việc quá tải (+$1%)"],
  [/Consistent Task Output \(\+(\d+)%\)/i, "Khối lượng task ổn định (+$1%)"],
  [/Increasing late task ratio due to potential blockers or workload/i, "Tỷ lệ task trễ tăng, có thể do vướng mắc hoặc quá tải công việc"],
  [/Declining productivity trend/i, "Xu hướng năng suất đang giảm"],
  [/High overtime frequency relative to task output/i, "Tần suất làm thêm cao so với sản lượng task"],
  [/Optimal workload balance/i, "Khối lượng công việc đang cân bằng"],
  [/Review task assignment and deadline estimations/i, "Rà soát phân công task và ước lượng deadline"],
  [/Check in with employee to identify productivity blockers/i, "Trao đổi với nhân sự để xác định điểm nghẽn năng suất"],
  [/Reduce workload by 15% and monitor burnout/i, "Giảm khoảng 15% khối lượng công việc và theo dõi nguy cơ burnout"],
  [/Maintain current project distribution/i, "Duy trì cách phân bổ công việc hiện tại"],
  [/Schedule performance review and well-being meeting/i, "Sắp xếp buổi trao đổi về hiệu suất và tình trạng sức khỏe công việc"],
];

function translateAiText(value: string) {
  const normalized = value.trim();
  for (const [pattern, replacement] of textTranslations) {
    if (pattern.test(normalized)) {
      return normalized.replace(pattern, replacement);
    }
  }
  return normalized;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeAxiosError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return maybeAxiosError.response?.data?.message || maybeAxiosError.message;
  }
  return undefined;
}

function getTrendColor(trend: string) {
  switch (trend) {
    case "Excellent":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Good":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "Stable":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Warning":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Critical":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getRiskLabel(probability: number) {
  if (probability > 0.6) return "Nguy cơ cao";
  if (probability > 0.3) return "Cần chú ý";
  return "An toàn";
}

function getRiskClass(probability: number) {
  if (probability > 0.6) return "bg-rose-100 text-rose-700";
  if (probability > 0.3) return "bg-orange-100 text-orange-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function PerformancePredictor({ projectId }: PerformancePredictorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformancePredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    ProjectMemberService.getMembers(projectId)
      .then((list) => {
        const parsed = list.map((member) => ({
          id: member.user.id.toString(),
          name: member.user.fullName || member.user.email,
        }));
        setMembers(parsed);
        if (parsed.length > 0) {
          setSelectedUserId(parsed[0].id);
        }
      })
      .catch(() => {
        setError("Không thể tải danh sách thành viên dự án.");
      });
  }, [projectId]);

  const selectedMemberName = useMemo(
    () => members.find((member) => member.id === selectedUserId)?.name ?? "Thành viên",
    [members, selectedUserId]
  );

  const chartData = useMemo(() => {
    if (!result?.history?.length) return [];
    return result.history
      .map((score, index) => ({
        name: index === result.history.length - 1 ? "Hiện tại" : `Kỳ ${index + 1}`,
        score: Number(score),
      }))
      .filter((item) => Number.isFinite(item.score));
  }, [result]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !result) return;

    const updateChartWidth = () => {
      const nextWidth = Math.floor(container.getBoundingClientRect().width);
      setChartWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateChartWidth();
    const resizeObserver = new ResizeObserver(updateChartWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [result]);

  const translatedFactors = useMemo(
    () => result?.topContributingFactors?.map(translateAiText) ?? [],
    [result]
  );

  const translatedCauses = useMemo(
    () => result?.rootCauses?.map(translateAiText) ?? [],
    [result]
  );

  const translatedRecommendations = useMemo(
    () => result?.recommendations?.map(translateAiText) ?? [],
    [result]
  );

  const handlePredict = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await UserService.getPerformancePrediction(selectedUserId);
      if (response.trend === "Error" || response.errorMessage) {
        setError(response.errorMessage || "Không thể phân tích hiệu suất nhân sự.");
        return;
      }
      setResult(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Không thể tải kết quả phân tích từ hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <Cpu className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-[1.65rem]">
                  Phân tích AI & dự đoán rủi ro
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Phân tích hiệu suất, xu hướng làm việc và nguy cơ burnout/nghỉ việc của nhân sự trong dự án.
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-auto xl:min-w-[460px]">
            <div className="relative min-w-0">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {members.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-400">
                  Đang tải thành viên...
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePredict}
              disabled={loading || !selectedUserId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Phân tích
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {error ? (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!result && !error && !loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
              <Cpu className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900">Chưa có dữ liệu phân tích</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Chọn một thành viên và bấm phân tích để hệ thống tổng hợp điểm sức khỏe, rủi ro và đề xuất hành động.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-12 text-center">
            <Cpu className="h-9 w-9 animate-pulse text-indigo-600" />
            <p className="mt-5 text-base font-semibold text-slate-700">AI đang phân tích dữ liệu...</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hệ thống đang đọc lịch sử làm việc và tính toán rủi ro. Vui lòng chờ trong giây lát.
            </p>
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-5 xl:grid-cols-12">
            <section className="xl:col-span-4">
              <div className="flex h-full min-h-[300px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Điểm sức khỏe tổng hợp</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Tin cậy {Math.round(result.confidence * 100)}%
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center py-6">
                  <div className="relative h-36 w-36">
                    <svg className="h-36 w-36 -rotate-90" viewBox="0 0 144 144" aria-hidden="true">
                      <circle cx="72" cy="72" r="60" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        fill="transparent"
                        stroke={getScoreColor(result.healthScore)}
                        strokeWidth="14"
                        strokeDasharray="376.99"
                        strokeDashoffset={376.99 - (376.99 * result.healthScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black tracking-tight text-slate-950">{result.healthScore}</span>
                      <span className="text-xs font-semibold text-slate-500">/ 100</span>
                    </div>
                  </div>

                  <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${getTrendColor(result.trend)}`}>
                    <TrendingUp className={`h-4 w-4 ${["Warning", "Critical"].includes(result.trend) ? "rotate-180" : ""}`} />
                    {trendLabelMap[result.trend] ?? result.trend}
                  </div>
                  <p className="mt-4 text-center text-sm text-slate-500">
                    Nhân sự: <span className="font-semibold text-slate-700">{selectedMemberName}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="xl:col-span-8">
              <div className="h-full min-h-[300px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Xu hướng hiệu suất 5 kỳ gần nhất</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Điểm dự đoán: {Math.round(result.predictedPerformanceScore)}
                  </span>
                </div>

                <div ref={chartContainerRef} className="h-[230px] w-full min-w-0">
                  {chartData.length > 0 && chartWidth > 0 ? (
                    <AreaChart
                      key={`${selectedUserId}-${chartWidth}`}
                      width={chartWidth}
                      height={230}
                      data={chartData}
                      margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="performanceScoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(value) => [`${value}`, "Điểm"]}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        fill="url(#performanceScoreFill)"
                        activeDot={{ r: 5, strokeWidth: 0, fill: "#4f46e5" }}
                      />
                    </AreaChart>
                  ) : chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
                      Chưa có dữ liệu lịch sử hiệu suất để hiển thị biểu đồ.
                    </div>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                  )}
                </div>
              </div>
            </section>

            <section className="xl:col-span-4">
              <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900">Rủi ro burnout/nghỉ việc</h3>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <span className="text-5xl font-black tracking-tight text-slate-950">
                    {Math.round(result.attritionProbability * 100)}
                    <span className="text-2xl text-slate-500">%</span>
                  </span>
                  <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${getRiskClass(result.attritionProbability)}`}>
                    {getRiskLabel(result.attritionProbability)}
                  </span>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      result.attritionProbability > 0.6
                        ? "bg-rose-500"
                        : result.attritionProbability > 0.3
                          ? "bg-orange-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.round(result.attritionProbability * 100)}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Xác suất nhân sự gặp áp lực công việc cao, burnout hoặc có nguy cơ rời dự án dựa trên lịch sử hoạt động.
                </p>
              </div>
            </section>

            <section className="xl:col-span-8">
              <div className="grid h-full gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Yếu tố ảnh hưởng</h3>
                  </div>
                  <ul className="space-y-3">
                    {translatedFactors.map((factor, index) => (
                      <li key={`${factor}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <span className="mt-0.5 rounded-full bg-indigo-100 p-1">
                          <Info className="h-3.5 w-3.5 text-indigo-600" />
                        </span>
                        <span className="text-sm font-medium leading-6 text-slate-700">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Nguyên nhân chính</h3>
                  </div>
                  <ul className="space-y-3">
                    {translatedCauses.map((cause, index) => (
                      <li key={`${cause}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <span className="mt-0.5 rounded-full bg-rose-100 p-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        </span>
                        <span className="text-sm font-medium leading-6 text-slate-700">{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="xl:col-span-12">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900">Đề xuất hành động từ AI</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {translatedRecommendations.map((recommendation, index) => (
                    <div key={`${recommendation}-${index}`} className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {index + 1}
                      </span>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
