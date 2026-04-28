"use client";

import { apiJava } from "@/lib/axios";
import { useEffect, useRef, useState } from "react";
import { Loader2, Activity, AlertTriangle, Bot, RefreshCcw, Search, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchDemoData(name: string): Promise<DataPoint[]> {
  const res = await apiJava.get<{ data: DataPoint[] }>(`/v1/burnout/demo-data?developerName=${encodeURIComponent(name)}`);
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

async function fetchAiMessage(result: AnalyzeResult): Promise<string> {
  const res = await apiJava.post<{ data: { message: string } }>("/v1/burnout/ai-message", {
    developerName: result.developerName,
    startDay: result.startDay,
    endDay: result.endDay,
    startLeadTime: result.startLeadTime,
    endLeadTime: result.endLeadTime,
    startDate: result.startDate,
    endDate: result.endDate,
  });
  return res.data.data.message;
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

const BAR_W = 7;
const BAR_GAP = 2;
const STEP = BAR_W + BAR_GAP;
const CHART_H = 240;
const LABEL_H = 28;
const PAD_L = 48;
const PAD_R = 12;

function BurnoutBarChart({
  data,
  highlight,
  highlightRef,
}: {
  data: DataPoint[];
  highlight: { start: number; end: number } | null;
  highlightRef: React.RefObject<HTMLDivElement>;
}) {
  const maxVal = Math.max(...data.map((d) => d.avgLeadTimeHours), 1);
  const svgW = PAD_L + data.length * STEP + PAD_R;
  const svgH = CHART_H + LABEL_H;

  // Y-axis labels
  const yTicks = [0, 3, 6, 9, 12, 15].filter((t) => t <= maxVal + 1);

  return (
    <div className="relative">
      {/* Scroll container */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        <div style={{ width: svgW + "px", position: "relative" }}>
          {/* Highlight overlay (positioned absolutely) */}
          {highlight && (
            <div
              ref={highlightRef}
              style={{
                position: "absolute",
                left: PAD_L + highlight.start * STEP - 3,
                top: 8,
                width: (highlight.end - highlight.start + 1) * STEP + 4,
                height: CHART_H - 16,
                background: "rgba(239,68,68,0.08)",
                border: "2px solid rgba(239,68,68,0.4)",
                borderRadius: 8,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          )}

          <svg width={svgW} height={svgH} style={{ display: "block" }}>
            {/* Horizontal grid lines */}
            {yTicks.map((tick) => {
              const y = CHART_H - (tick / (maxVal + 1)) * (CHART_H - 20) - 4;
              return (
                <g key={tick}>
                  <line
                    x1={PAD_L}
                    y1={y}
                    x2={svgW - PAD_R}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
                    {tick}h
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((point, i) => {
              const barH = Math.max(2, (point.avgLeadTimeHours / (maxVal + 1)) * (CHART_H - 20));
              const x = PAD_L + i * STEP;
              const y = CHART_H - barH - 4;

              const inBurnout = highlight && i >= highlight.start && i <= highlight.end;
              const fill = inBurnout
                ? point.avgLeadTimeHours >= 10
                  ? "#ef4444"   // red
                  : "#f97316"   // orange
                : "#94a3b8";    // slate normal

              // Day labels every 30 days
              const showLabel = (i + 1) % 30 === 0 || i === 0;

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={BAR_W}
                    height={barH}
                    rx={2}
                    fill={fill}
                    opacity={inBurnout ? 1 : 0.6}
                  >
                    <title>
                      Ngày {point.day} ({point.date}): {point.avgLeadTimeHours}h
                    </title>
                  </rect>

                  {showLabel && (
                    <text
                      x={x + BAR_W / 2}
                      y={CHART_H + LABEL_H - 6}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#64748b"
                    >
                      D{point.day}
                    </text>
                  )}

                  {/* Trendline dot on burnout zone */}
                  {inBurnout && (
                    <circle
                      cx={x + BAR_W / 2}
                      cy={y}
                      r={2.5}
                      fill={fill}
                      stroke="white"
                      strokeWidth={1}
                    />
                  )}
                </g>
              );
            })}

            {/* Trendline on burnout zone */}
            {highlight && (() => {
              const pts = data
                .slice(highlight.start, highlight.end + 1)
                .map((p, i) => {
                  const x = PAD_L + (highlight.start + i) * STEP + BAR_W / 2;
                  const barH = Math.max(2, (p.avgLeadTimeHours / (maxVal + 1)) * (CHART_H - 20));
                  const y = CHART_H - barH - 4;
                  return `${x},${y}`;
                })
                .join(" ");
              return (
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-slate-400 opacity-60" />
          Bình thường
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-orange-400" />
          Burnout nhẹ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500" />
          Burnout nặng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-6 border-t-2 border-dashed border-red-500" />
          Trendline tăng
        </span>
      </div>
    </div>
  );
}

// ─── Slack Message UI ─────────────────────────────────────────────────────────

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
      {/* Slack-style header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#3f0e40] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
          <svg width="16" height="16" viewBox="0 0 54 54" fill="none">
            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-white">Slack</span>
        <span className="ml-auto text-xs text-white/60"># direct-messages</span>
      </div>

      {/* Channel label */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
        DM with {developerName}
      </div>

      {/* Message area */}
      <div className="min-h-[160px] p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold">
                EM
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Engineering Manager</span>
                  <span className="text-xs text-slate-400">{timeStr}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block h-2 w-2 rounded-full bg-slate-400"
                        style={{
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-slate-500">AI đang soạn tin nhắn...</span>
                </div>
              </div>
            </div>
          </div>
        ) : message ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold">
              EM
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Engineering Manager</span>
                <span className="text-xs text-slate-400">{timeStr}</span>
              </div>
              <div className="max-w-xl rounded-lg bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800 whitespace-pre-line">
                {message}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                <button className="hover:text-slate-600">👍 Thích</button>
                <button className="hover:text-slate-600">💬 Trả lời</button>
                <button className="hover:text-slate-600">📌 Ghim</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400">
            Tin nhắn AI sẽ hiển thị sau khi phân tích xong
          </div>
        )}
      </div>

      {/* Fake input bar */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-400">
          Message {developerName}...
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Burnout Result Badge ─────────────────────────────────────────────────────

function ResultBadge({ result }: { result: AnalyzeResult }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-900">Phát hiện chuỗi Burnout!</p>
          <p className="text-xs text-orange-700">Thuật toán Longest Increasing Subarray — O(n)</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Bắt đầu", value: `Ngày ${result.startDay}` },
          { label: "Kết thúc", value: `Ngày ${result.endDay}` },
          { label: "Kéo dài", value: `${result.length} ngày` },
          { label: "Lead Time tăng", value: `${result.startLeadTime}h → ${result.endLeadTime}h` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-white px-3 py-2 text-center shadow-sm border border-orange-100">
            <p className="text-[10px] font-medium uppercase tracking-wide text-orange-600">{item.label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-orange-700">
        {result.startDate} → {result.endDate} &nbsp;·&nbsp; Lead Time tăng{" "}
        <strong>{((result.endLeadTime / result.startLeadTime) * 100 - 100).toFixed(0)}%</strong> so với điểm khởi đầu
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BurnoutDetector() {
  const [developerName, setDeveloperName] = useState("Alex");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const highlightRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const loadData = async (name: string) => {
    setLoadingData(true);
    setResult(null);
    setAiMessage(null);
    setError(null);
    try {
      const pts = await fetchDemoData(name);
      setData(pts);
    } catch {
      setError("Không thể tải dữ liệu demo. Vui lòng thử lại.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadData(developerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async () => {
    if (!data.length) return;
    setAnalyzing(true);
    setResult(null);
    setAiMessage(null);
    setError(null);

    try {
      const res = await runAnalyze(data, developerName);
      setResult(res);

      // Auto-scroll chart đến vùng burnout
      setTimeout(() => {
        if (chartScrollRef.current && highlightRef.current) {
          const scrollX = Math.max(0, highlightRef.current.offsetLeft - 80);
          chartScrollRef.current.scrollTo({ left: scrollX, behavior: "smooth" });
        }
      }, 200);

      // Gọi AI sau khi có kết quả
      setAiLoading(true);
      try {
        const msg = await fetchAiMessage(res);
        setAiMessage(msg);
      } catch {
        setAiMessage(null);
        setError("Phân tích xong nhưng AI không thể tạo tin nhắn lúc này.");
      } finally {
        setAiLoading(false);
      }
    } catch {
      setError("Phân tích thất bại. Vui lòng thử lại.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReload = () => {
    void loadData(developerName);
  };

  const highlight = result
    ? { start: result.startIndex, end: result.endIndex }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Team Health — Burnout Detector</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Biểu đồ Lead Time 180 ngày. Thuật toán{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
              Longest Increasing Subarray O(n)
            </code>{" "}
            tự động phát hiện chuỗi sa sút và AI viết tin nhắn can thiệp.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={developerName}
              onChange={(e) => setDeveloperName(e.target.value)}
              onBlur={() => void loadData(developerName)}
              placeholder="Tên developer"
              className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <button
            type="button"
            onClick={handleReload}
            disabled={loadingData}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={loadingData || analyzing || !data.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
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

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Average Lead Time — {developerName}
            </p>
            <p className="text-xs text-slate-500">180 ngày gần nhất (giờ/task)</p>
          </div>
          {result && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              Burnout: Ngày {result.startDay} → {result.endDay}
            </span>
          )}
        </div>

        {loadingData ? (
          <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div ref={chartScrollRef} className="overflow-x-auto">
            <BurnoutBarChart
              data={data}
              highlight={highlight}
              highlightRef={highlightRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        )}
      </div>

      {/* Result badge */}
      {result && <ResultBadge result={result} />}

      {/* Slack message */}
      {(result || aiLoading) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Tin nhắn Slack từ Engineering Manager</h3>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              AI Generated
            </span>
          </div>
          <SlackMessage
            message={aiMessage}
            developerName={developerName}
            isLoading={aiLoading}
          />
        </div>
      )}

      {/* Algorithm explanation */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Thuật toán</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-6 text-green-400">
{`// Longest Increasing Subarray — O(n)
// Input: mảng 180 phần tử avgLeadTimeHours[]
// Output: { startIndex, endIndex, length }

int bestStart = 0, bestLen = 1;
int curStart = 0, curLen = 1;

for (int i = 1; i < n; i++) {
    if (leadTimes[i] > leadTimes[i - 1]) {
        curLen++;                      // kéo dài chuỗi tăng
    } else {
        curStart = i; curLen = 1;     // reset nếu không tăng
    }
    if (curLen > bestLen) {
        bestLen = curLen;             // cập nhật kết quả tốt nhất
        bestStart = curStart;
    }
}
// → Phát hiện Ngày ${result ? result.startDay : 60}–${result ? result.endDay : 74}: Lead Time tăng ${result ? result.startLeadTime : 4.0}h → ${result ? result.endLeadTime : 12.0}h`}
        </pre>
      </div>
    </div>
  );
}
