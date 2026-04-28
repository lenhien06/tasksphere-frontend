"use client";

import { apiJava } from "@/lib/axios";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Coffee,
  Link,
  Loader2,
  RefreshCcw,
  Search,
  Send,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataPoint {
  day: number;
  date: string;
  avgLeadTimeHours: number;
}

interface AnalyzeResult {
  startIndex: number;
  endIndex: number;
  length: number;
  startLeadTime: number;
  endLeadTime: number;
  startDate: string;
  endDate: string;
  startDay: number;
  endDay: number;
  developerName: string;
}

interface ChartRow {
  day: number;
  date: string;
  leadTime: number;
  trendline: number | null;
  barColor: string;
}

interface Member {
  id: string;
  name: string;
}

// ─── Linear Regression ────────────────────────────────────────────────────────

function computeSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function computeIntercept(points: { x: number; y: number }[], slope: number): number {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  return (sumY - slope * sumX) / n;
}

// ─── Build chart rows ─────────────────────────────────────────────────────────

function buildRows(
  data: DataPoint[],
  highlight: { start: number; end: number } | null
): { rows: ChartRow[]; slope: number } {
  let slope = 0;
  let intercept = 0;

  if (highlight) {
    const pts = data.slice(highlight.start, highlight.end + 1).map((p, i) => ({
      x: highlight.start + i,
      y: p.avgLeadTimeHours,
    }));
    slope = computeSlope(pts);
    intercept = computeIntercept(pts, slope);
  }

  const rows: ChartRow[] = data.map((point, i) => {
    const inBurnout = highlight && i >= highlight.start && i <= highlight.end;
    const trendline =
      inBurnout ? parseFloat((slope * i + intercept).toFixed(2)) : null;

    return {
      day: point.day,
      date: point.date,
      leadTime: point.avgLeadTimeHours,
      trendline,
      barColor: inBurnout
        ? point.avgLeadTimeHours >= 10 ? "#ef4444" : "#f97316"
        : "#94a3b8",
    };
  });

  return { rows, slope };
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchDemoData(name: string): Promise<DataPoint[]> {
  const res = await apiJava.get<{ data: DataPoint[] }>(
    `/v1/burnout/demo-data?developerName=${encodeURIComponent(name)}`
  );
  return res.data.data;
}

async function runAnalyze(data: DataPoint[], developerName: string): Promise<AnalyzeResult> {
  const res = await apiJava.post<{ data: AnalyzeResult }>("/v1/burnout/analyze", {
    developerName,
    leadTimes: data.map((d) => d.avgLeadTimeHours),
    dates: data.map((d) => d.date),
  });
  return res.data.data;
}

async function sendSlack(webhookUrl: string, message: string, developerName: string): Promise<{ success: boolean; detail: string }> {
  const res = await apiJava.post<{ data: { success: boolean; detail: string } }>("/v1/burnout/send-slack", {
    webhookUrl,
    message,
    developerName,
  });
  return res.data.data;
}

async function fetchAiMessage(result: AnalyzeResult, coffeeTime: string): Promise<string> {
  const res = await apiJava.post<{ data: { message: string } }>("/v1/burnout/ai-message", {
    developerName: result.developerName,
    startDay: result.startDay,
    endDay: result.endDay,
    startLeadTime: result.startLeadTime,
    endLeadTime: result.endLeadTime,
    startDate: result.startDate,
    endDate: result.endDate,
    coffeeTime,
  });
  return res.data.data.message;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-bold text-slate-800">Ngày {row.day} · {row.date}</p>
      <p className="mt-1 text-slate-700">
        Thời gian hoàn thành: <strong>{row.leadTime}h</strong>
      </p>
      {row.trendline !== null && (
        <p className="text-red-500">Xu hướng: {row.trendline}h</p>
      )}
    </div>
  );
}

// ─── Slack UI ─────────────────────────────────────────────────────────────────

function SlackMessage({
  message,
  developerName,
  isLoading,
}: {
  message: string | null;
  developerName: string;
  isLoading: boolean;
}) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#3f0e40] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
          <svg width="16" height="16" viewBox="0 0 54 54" fill="none">
            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-white">Slack — Tin nhắn riêng</span>
        <span className="ml-auto text-xs text-white/60">@{developerName}</span>
      </div>

      {/* Message */}
      <div className="min-h-[140px] p-4">
        {isLoading ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold">EM</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Engineering Manager</span>
                <span className="text-xs text-slate-400">{timeStr}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3">
                <span className="flex gap-1">
                  {(["", "[animation-delay:0.2s]", "[animation-delay:0.4s]"] as const).map((delay, i) => (
                    <span key={i} className={`inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400 ${delay}`} />
                  ))}
                </span>
                <span className="text-xs text-slate-500">AI đang soạn tin nhắn...</span>
              </div>
            </div>
          </div>
        ) : message ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold">EM</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Engineering Manager</span>
                <span className="text-xs text-slate-400">{timeStr}</span>
              </div>
              <div className="max-w-xl rounded-lg bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800 whitespace-pre-line">
                {message}
              </div>
              <div className="mt-1 flex gap-3 text-xs text-slate-400">
                <button type="button" className="hover:text-slate-600">👍</button>
                <button type="button" className="hover:text-slate-600">💬 Trả lời</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-sm text-slate-400">
            Tin nhắn sẽ hiển thị sau khi phân tích
          </div>
        )}
      </div>

      {/* Fake input */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-400">
          Nhắn tin {developerName}...
        </div>
      </div>
    </div>
  );
}

// ─── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({ result, slope }: { result: AnalyzeResult; slope: number }) {
  const increasePercent = ((result.endLeadTime / result.startLeadTime) * 100 - 100).toFixed(0);
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-900">Phát hiện chuỗi sa sút!</p>
          <p className="text-xs text-orange-600">{result.startDate} → {result.endDate}</p>
        </div>
        {slope > 0 && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Xu hướng tăng xác nhận
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Bắt đầu", value: `Ngày ${result.startDay}` },
          { label: "Kết thúc", value: `Ngày ${result.endDay}` },
          { label: "Kéo dài", value: `${result.length} ngày liên tiếp` },
          { label: "Thời gian xử lý", value: `${result.startLeadTime}h → ${result.endLeadTime}h (+${increasePercent}%)` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-white px-3 py-2 text-center shadow-sm border border-orange-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">{item.label}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BurnoutDetectorProps {
  projectId: string;
}

export default function BurnoutDetector({ projectId }: BurnoutDetectorProps) {
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [developerName, setDeveloperName] = useState("Alex");
  const [coffeeTime, setCoffeeTime] = useState("15:00");
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [regressionSlope, setRegressionSlope] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState<{ success: boolean; detail: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartWidth = Math.max(1400, chartData.length * 14);

  // Mount check — Recharts cần client-side
  useEffect(() => { setMounted(true); }, []);

  // Fetch thành viên dự án
  useEffect(() => {
    if (!projectId) return;
    ProjectMemberService.getMembers(projectId)
      .then((list) => {
        const parsed = list.map((m) => ({ id: m.user.id, name: m.user.fullName || m.user.email }));
        setMembers(parsed);
        if (parsed.length > 0) {
          setDeveloperName(parsed[0].name);
          void loadData(parsed[0].name);
        }
      })
      .catch(() => {/* dùng tên mặc định */});
  }, [projectId]);

  const loadData = async (name: string) => {
    setLoadingData(true);
    setResult(null);
    setAiMessage(null);
    setError(null);
    setRegressionSlope(0);
    try {
      const pts = await fetchDemoData(name);
      setRawData(pts);
      const { rows } = buildRows(pts, null);
      setChartData(rows);
    } catch {
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { void loadData(developerName); }, []); // eslint-disable-line

  const handleMemberChange = (name: string) => {
    setDeveloperName(name);
    void loadData(name);
  };

  const handleAnalyze = async () => {
    if (!rawData.length) return;
    setAnalyzing(true);
    setResult(null);
    setAiMessage(null);
    setError(null);

    try {
      const res = await runAnalyze(rawData, developerName);
      const highlight = { start: res.startIndex, end: res.endIndex };
      const { rows, slope } = buildRows(rawData, highlight);
      setChartData(rows);
      setRegressionSlope(slope);
      setResult(res);

      setTimeout(() => {
        chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        const container = chartScrollRef.current;
        if (!container || !rawData.length) return;

        const averageBarWidth = chartWidth / rawData.length;
        const highlightCenter =
          ((res.startIndex + res.endIndex) / 2 + 0.5) * averageBarWidth;
        const nextScrollLeft = Math.max(
          0,
          highlightCenter - container.clientWidth / 2
        );

        container.scrollTo({
          left: nextScrollLeft,
          behavior: "smooth",
        });
      }, 300);

      setAiLoading(true);
      try {
        const msg = await fetchAiMessage(res, coffeeTime);
        setAiMessage(msg);
      } catch {
        setError("Phân tích xong nhưng AI tạm thời không phản hồi.");
      } finally {
        setAiLoading(false);
      }
    } catch {
      setError("Phân tích thất bại. Vui lòng thử lại.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendSlack = async () => {
    if (!aiMessage || !webhookUrl.trim()) return;
    setSlackSending(true);
    setSlackResult(null);
    try {
      const res = await sendSlack(webhookUrl.trim(), aiMessage, developerName);
      setSlackResult(res);
    } catch {
      setSlackResult({ success: false, detail: "Không thể kết nối tới server." });
    } finally {
      setSlackSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              Phát hiện Burnout — Sức khỏe Đội ngũ
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Phân tích thời gian hoàn thành task 180 ngày, phát hiện chuỗi sa sút và gợi ý can thiệp sớm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member selector */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {members.length > 0 ? (
              <select
                value={developerName}
                onChange={(e) => handleMemberChange(e.target.value)}
                aria-label="Chọn thành viên"
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={developerName}
                onChange={(e) => setDeveloperName(e.target.value)}
                onBlur={() => void loadData(developerName)}
                placeholder="Tên thành viên"
                aria-label="Tên thành viên"
                className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-400"
              />
            )}
          </div>

          {/* Coffee time */}
          <div className="relative">
            <Coffee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="time"
              value={coffeeTime}
              onChange={(e) => setCoffeeTime(e.target.value)}
              aria-label="Giờ hẹn trao đổi"
              title="Giờ hẹn trao đổi"
              className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-400"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadData(developerName)}
            disabled={loadingData}
            aria-label="Tải lại"
            title="Tải lại"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={loadingData || analyzing || !rawData.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Phân tích Sức khỏe Đội ngũ
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Chart ── */}
      <div ref={chartRef} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Thời gian hoàn thành task trung bình — {developerName}
            </p>
            <p className="text-xs text-slate-400">180 ngày gần nhất (giờ/task)</p>
          </div>
          {result && (
            <span className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <AlertTriangle className="h-3 w-3" />
              Ngày {result.startDay} → {result.endDay}
            </span>
          )}
        </div>

        {loadingData ? (
          <div className="flex h-72 items-center justify-center rounded-lg bg-slate-50">
            <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
          </div>
        ) : !mounted ? (
          <div className="h-72 rounded-lg bg-slate-50" />
        ) : (
          <>
            <div ref={chartScrollRef} className="overflow-x-auto">
              <ComposedChart width={chartWidth} height={320} data={chartData} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval={13}
                  tickFormatter={(v: number) => `D${v}`}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                  width={42}
                />
                <Tooltip content={CustomTooltip} />
                <ReferenceLine
                  y={6}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  label={{ value: "Normal", fontSize: 10, fill: "#16a34a", position: "insideTopRight" }}
                />
                <ReferenceLine
                  y={10}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{ value: "Warning", fontSize: 10, fill: "#ea580c", position: "insideTopRight" }}
                />
                <ReferenceLine
                  y={14}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "Danger", fontSize: 10, fill: "#dc2626", position: "insideTopRight" }}
                />

                {result && (
                  <>
                    <ReferenceArea
                      x1={result.startDay}
                      x2={result.endDay}
                      fill="#fb923c"
                      fillOpacity={0.12}
                    />
                    <ReferenceLine
                      x={result.startDay}
                      stroke="#f97316"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: `D${result.startDay}`, fontSize: 9, fill: "#f97316", position: "top" }}
                    />
                    <ReferenceLine
                      x={result.endDay}
                      stroke="#ef4444"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: `D${result.endDay}`, fontSize: 9, fill: "#ef4444", position: "top" }}
                    />
                  </>
                )}

                <Bar
                  dataKey="leadTime"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={10}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`bar-${entry.day}-${index}`}
                      fill={entry.barColor}
                      fillOpacity={entry.trendline != null ? 1 : 0.58}
                    />
                  ))}
                </Bar>

                <Line
                  dataKey="trendline"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  name="Xu hướng"
                />
              </ComposedChart>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-slate-400 opacity-50" />
                Bình thường
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-orange-400" />
                Cảnh báo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500" />
                Nguy hiểm
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="24" height="8">
                  <line x1="0" y1="4" x2="24" y2="4" stroke="#dc2626" strokeWidth="2.5" />
                </svg>
                Đường xu hướng
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Result Banner ── */}
      <div>
        {result && <ResultBanner result={result} slope={regressionSlope} />}
      </div>

      {/* ── AI Slack ── */}
      {(result || aiLoading) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Gợi ý can thiệp — Tin nhắn từ Quản lý</h3>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              AI
            </span>
            {coffeeTime && result && (
              <span className="ml-auto flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Coffee className="h-3 w-3" />
                Hẹn {coffeeTime}
              </span>
            )}
          </div>
          <SlackMessage message={aiMessage} developerName={developerName} isLoading={aiLoading} />

          {/* Slack Webhook sender */}
          {aiMessage && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-600">Gửi tin nhắn qua Slack thật</p>
              <p className="mb-3 text-[11px] text-slate-400">
                Tạo Incoming Webhook tại{" "}
                <span className="font-medium text-violet-600">api.slack.com/apps</span>{" "}
                → chọn app → Incoming Webhooks → Add New Webhook, rồi dán URL vào đây.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); setSlackResult(null); }}
                    placeholder="https://hooks.slack.com/services/..."
                    aria-label="Slack Webhook URL"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendSlack()}
                  disabled={slackSending || !webhookUrl.trim()}
                  aria-label="Gửi qua Slack"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#4a154b] px-4 text-xs font-bold text-white hover:bg-[#611f69] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {slackSending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  Gửi Slack
                </button>
              </div>

              {slackResult && (
                <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  slackResult.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {slackResult.success
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  {slackResult.detail}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
