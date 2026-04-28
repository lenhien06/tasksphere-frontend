"use client";

import { apiJava } from "@/lib/axios";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Coffee,
  Database,
  Link,
  Loader2,
  PencilLine,
  RefreshCcw,
  Search,
  Send,
  TrendingUp,
  Upload,
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

interface HoveredChartPoint {
  row: ChartRow;
  x: number;
  y: number;
}

interface ParsedMockInput {
  data: DataPoint[];
  suggestedName?: string | null;
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
): { rows: ChartRow[]; slope: number; intercept: number } {
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

  return { rows, slope, intercept };
}

function buildTrendPath(
  rows: ChartRow[],
  getX: (index: number) => number,
  getY: (value: number) => number
): string {
  const points = rows
    .map((row, index) => (row.trendline != null ? `${getX(index)},${getY(row.trendline)}` : null))
    .filter(Boolean);

  if (points.length === 0) return "";
  return `M ${points.join(" L ")}`;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeLeadTime(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2));
    }
  }

  return null;
}

function buildDataPoints(leadTimes: number[], dates?: string[]): DataPoint[] {
  const resolvedDates =
    dates && dates.length === leadTimes.length
      ? dates
      : leadTimes.map((_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (leadTimes.length - 1 - index));
          return formatDateInput(date);
        });

  return leadTimes.map((leadTime, index) => ({
    day: index + 1,
    date: resolvedDates[index],
    avgLeadTimeHours: Number(leadTime.toFixed(2)),
  }));
}

function parseMockJson(input: unknown): ParsedMockInput {
  if (Array.isArray(input)) {
    const numericValues = input
      .map((value) => normalizeLeadTime(value))
      .filter((value): value is number => value !== null);

    if (numericValues.length === input.length && numericValues.length > 0) {
      return { data: buildDataPoints(numericValues) };
    }

    const objectRows = input
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const leadTime =
          normalizeLeadTime(row.avgLeadTimeHours) ??
          normalizeLeadTime(row.leadTime) ??
          normalizeLeadTime(row.value);

        if (leadTime === null) return null;

        return {
          day: typeof row.day === "number" ? row.day : index + 1,
          date: typeof row.date === "string" && row.date.trim() ? row.date.trim() : "",
          avgLeadTimeHours: leadTime,
        };
      })
      .filter(
        (
          item
        ): item is { day: number; date: string; avgLeadTimeHours: number } => item !== null
      );

    if (objectRows.length === input.length && objectRows.length > 0) {
      const fallbackDates = buildDataPoints(objectRows.map((row) => row.avgLeadTimeHours)).map(
        (row) => row.date
      );

      return {
        data: objectRows.map((row, index) => ({
          day: index + 1,
          date: row.date || fallbackDates[index],
          avgLeadTimeHours: row.avgLeadTimeHours,
        })),
      };
    }
  }

  if (input && typeof input === "object") {
    const payload = input as Record<string, unknown>;

    if (Array.isArray(payload.data)) {
      return parseMockJson(payload.data);
    }

    if (Array.isArray(payload.leadTimes)) {
      const leadTimes = payload.leadTimes
        .map((value) => normalizeLeadTime(value))
        .filter((value): value is number => value !== null);

      if (leadTimes.length !== payload.leadTimes.length || leadTimes.length === 0) {
        throw new Error("The leadTimes array contains invalid values.");
      }

      const dates = Array.isArray(payload.dates)
        ? payload.dates.map((date) => String(date))
        : undefined;

      return {
        data: buildDataPoints(leadTimes, dates),
        suggestedName:
          typeof payload.developerName === "string" ? payload.developerName.trim() : null,
      };
    }
  }

  throw new Error("JSON does not match a supported format.");
}

function parseMockDelimited(text: string): ParsedMockInput {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("There is no data to analyze.");
  }

  const tokenValues = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => normalizeLeadTime(token));

  if (tokenValues.length > 1 && tokenValues.every((value) => value !== null)) {
    return { data: buildDataPoints(tokenValues as number[]) };
  }

  const records: { date?: string; value: number }[] = [];

  for (const line of lines) {
    const cells = line
      .split(/[,\t;]+/)
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (!cells.length) continue;

    const singleValue = normalizeLeadTime(cells[0]);
    if (cells.length === 1 && singleValue !== null) {
      records.push({ value: singleValue });
      continue;
    }

    if (/date|day|lead|time|value|avg/i.test(cells.join(" "))) {
      continue;
    }

    const value = normalizeLeadTime(cells[cells.length - 1]);
    if (value !== null) {
      records.push({
        date: cells.length > 1 ? cells[0] : undefined,
        value,
      });
    }
  }

  if (!records.length) {
    throw new Error("Unable to read lead-time values from the provided content.");
  }

  const leadTimes = records.map((record) => record.value);
  const dates = records.some((record) => record.date)
    ? buildDataPoints(leadTimes).map((row, index) => records[index].date || row.date)
    : undefined;

  return { data: buildDataPoints(leadTimes, dates) };
}

function parseMockInput(text: string): ParsedMockInput {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Please enter or upload mock data.");
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return parseMockJson(JSON.parse(trimmed));
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Unable to read the JSON file.");
    }
  }

  return parseMockDelimited(trimmed);
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
      <p className="font-bold text-slate-800">Day {row.day} · {row.date}</p>
      <p className="mt-1 text-slate-700">
        Lead time: <strong>{row.leadTime}h</strong>
      </p>
      {row.trendline !== null && (
        <p className="text-red-500">Trend: {row.trendline}h</p>
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
        <span className="text-sm font-semibold text-white">Slack — Direct message</span>
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
                <span className="text-xs text-slate-500">AI is drafting the message...</span>
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
            </div>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-sm text-slate-400">
            The message will appear after analysis
          </div>
        )}
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
          <p className="text-sm font-bold text-orange-900">Burnout trend detected</p>
          <p className="text-xs text-orange-600">{result.startDate} → {result.endDate}</p>
        </div>
        {slope > 0 && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Upward trend confirmed
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Start", value: `Day ${result.startDay}` },
          { label: "End", value: `Day ${result.endDay}` },
          { label: "Duration", value: `${result.length} consecutive days` },
          { label: "Lead Time", value: `${result.startLeadTime}h → ${result.endLeadTime}h (+${increasePercent}%)` },
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
  const [dataSource, setDataSource] = useState<"demo" | "mock">("demo");
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [regressionSlope, setRegressionSlope] = useState(0);
  const [regressionIntercept, setRegressionIntercept] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState<{ success: boolean; detail: string } | null>(null);
  const [mockPanelOpen, setMockPanelOpen] = useState(false);
  const [mockInputText, setMockInputText] = useState("");
  const [mockDraftActive, setMockDraftActive] = useState(false);
  const [mockInputError, setMockInputError] = useState<string | null>(null);
  const [mockInputInfo, setMockInputInfo] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredChartPoint | null>(null);
  const [chartViewportWidth, setChartViewportWidth] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const chartWidth = Math.max(chartViewportWidth, chartData.length * 16, 960);
  const chartHeight = 300;
  const paddingTop = 18;
  const paddingRight = 18;
  const paddingBottom = 30;
  const paddingLeft = 42;
  const plotWidth = Math.max(1, chartWidth - paddingLeft - paddingRight);
  const plotHeight = Math.max(1, chartHeight - paddingTop - paddingBottom);
  const maxLeadTime = chartData.reduce((max, row) => {
    const trend = row.trendline ?? 0;
    return Math.max(max, row.leadTime, trend);
  }, 0);
  const yMax = Math.max(14, Math.ceil(maxLeadTime / 2) * 2);
  const yTicks = Array.from({ length: 5 }, (_, idx) => Math.round((yMax / 4) * idx));
  const stepX = chartData.length > 0 ? plotWidth / chartData.length : plotWidth;
  const barWidth = Math.max(4, Math.min(10, stepX * 0.68));
  const getBarX = (index: number) => paddingLeft + index * stepX + Math.max(0, (stepX - barWidth) / 2);
  const getCenterX = (index: number) => paddingLeft + index * stepX + stepX / 2;
  const getY = (value: number) => paddingTop + plotHeight - (value / yMax) * plotHeight;
  const trendPath = buildTrendPath(chartData, getCenterX, getY);
  const highlightedStartX = result ? getBarX(Math.max(0, result.startIndex)) : null;
  const highlightedEndX = result ? getBarX(Math.max(0, result.endIndex)) + barWidth : null;
  const resolveTooltipX = (index: number) => {
    const scrollLeft = chartScrollRef.current?.scrollLeft ?? 0;
    return getCenterX(index) - scrollLeft;
  };

  const resetInsightState = () => {
    setResult(null);
    setAiMessage(null);
    setError(null);
    setRegressionSlope(0);
    setRegressionIntercept(0);
    setHoveredPoint(null);
    setAiLoading(false);
    setSlackResult(null);
  };

  // Mount check để chỉ render chart khi client-side đã sẵn sàng
  useEffect(() => { setMounted(true); }, []);

  // Đo bề ngang thực của chart host thay vì phụ thuộc ResponsiveContainer
  useEffect(() => {
    const node = chartHostRef.current;
    if (!node) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      if (nextWidth > 0) setChartViewportWidth(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

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
    resetInsightState();
    try {
      const pts = await fetchDemoData(name);
      setRawData(pts);
      const { rows } = buildRows(pts, null);
      setChartData(rows);
      setDataSource("demo");
      setMockDraftActive(false);
    } catch {
      setError("Unable to load data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { void loadData(developerName); }, []); // eslint-disable-line

  const handleMemberChange = (name: string) => {
    setDeveloperName(name);
    if (dataSource === "mock" && rawData.length) {
      resetInsightState();
      return;
    }
    void loadData(name);
  };

  const handleApplyMockData = () => {
    try {
      const parsed = parseMockInput(mockInputText);
      resetInsightState();
      setRawData(parsed.data);
      setChartData(buildRows(parsed.data, null).rows);
      setDataSource("mock");
      setMockDraftActive(true);
      setMockInputError(null);
      setMockInputInfo(
        `Applied ${parsed.data.length} days of custom data for ${developerName}.`
      );
    } catch (applyError) {
      setMockInputInfo(null);
      setMockInputError(
        applyError instanceof Error ? applyError.message : "Unable to apply mock data."
      );
    }
  };

  const handleMockFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setMockInputText(text);
      setMockDraftActive(true);
      setMockInputError(null);
      setMockInputInfo(`Loaded ${file.name}. Click "Apply Data" to update the chart.`);
    } catch {
      setMockInputInfo(null);
      setMockInputError("Unable to read the selected file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRefresh = () => {
    if (dataSource === "mock") {
      handleApplyMockData();
      return;
    }
    void loadData(developerName);
  };

  const handleResetToDemo = () => {
    setDataSource("demo");
    setMockDraftActive(false);
    setMockInputError(null);
    setMockInputInfo("Switched back to system demo data.");
    void loadData(developerName);
  };

  const handleAnalyze = async () => {
    let dataToAnalyze = rawData;

    if (mockDraftActive) {
      try {
        const parsed = parseMockInput(mockInputText);
        dataToAnalyze = parsed.data;
        setRawData(parsed.data);
        setChartData(buildRows(parsed.data, null).rows);
        setDataSource("mock");
        setMockInputError(null);
        setMockInputInfo(
          `Analyzing the latest ${parsed.data.length}-day mock dataset for ${developerName}.`
        );
      } catch (applyError) {
        const message =
          applyError instanceof Error ? applyError.message : "Unable to read mock data for analysis.";
        setMockInputInfo(null);
        setMockInputError(message);
        setError(message);
        return;
      }
    }

    if (!dataToAnalyze.length) return;
    setAnalyzing(true);
    resetInsightState();

    try {
      const res = await runAnalyze(dataToAnalyze, developerName);
      const highlight = { start: res.startIndex, end: res.endIndex };
      const { rows, slope, intercept } = buildRows(dataToAnalyze, highlight);
      setChartData(rows);
      setRegressionSlope(slope);
      setRegressionIntercept(intercept);
      setResult(res);

      setTimeout(() => {
        chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        const scrollBox = chartScrollRef.current;
        if (!scrollBox || !dataToAnalyze.length) return;

        const averageBarWidth = chartWidth / dataToAnalyze.length;
        const highlightCenter =
          ((res.startIndex + res.endIndex) / 2 + 0.5) * averageBarWidth;
        const targetLeft = Math.max(0, highlightCenter - scrollBox.clientWidth / 2);

        scrollBox.scrollTo({
          left: targetLeft,
          behavior: "smooth",
        });
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);

      setAiLoading(true);
      try {
        const msg = await fetchAiMessage(res, coffeeTime);
        setAiMessage(msg);
      } catch {
        setError("Analysis completed, but AI is temporarily unavailable.");
      } finally {
        setAiLoading(false);
      }
    } catch {
      setError("Analysis failed. Please try again.");
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
      setSlackResult({ success: false, detail: "Unable to connect to the server." });
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
              Burnout Detection — Team Health
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Analyze 180 days of lead time, detect silent performance decline, and surface early intervention guidance.
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
                aria-label="Select member"
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
                placeholder="Member name"
                aria-label="Member name"
                className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-400"
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setMockPanelOpen((open) => !open)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              mockPanelOpen || dataSource === "mock" || mockDraftActive
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <PencilLine className="h-4 w-4" />
            Mock Data
          </button>

          {/* Coffee time */}
          <div className="relative">
            <Coffee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="time"
              value={coffeeTime}
              onChange={(e) => setCoffeeTime(e.target.value)}
              aria-label="Coffee chat time"
              title="Coffee chat time"
              className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-400"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingData}
            aria-label="Reload"
            title="Reload"
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
            Analyze Team Health
          </button>
        </div>
      </div>

      {mockPanelOpen && (
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900">Mock Data Input</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600 shadow-sm">
                  Custom
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                Upload File
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={(e) => void handleMockFileChange(e)}
                  className="hidden"
                />
              </label>
              {dataSource === "mock" && (
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset to Demo
                </button>
              )}
              <button
                type="button"
                onClick={handleApplyMockData}
                className="inline-flex h-10 items-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600"
              >
                Apply Data
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <textarea
                value={mockInputText}
                onChange={(e) => {
                  setMockInputText(e.target.value);
                  setMockDraftActive(Boolean(e.target.value.trim()));
                  setMockInputError(null);
                  setMockInputInfo(null);
                }}
                placeholder={`Quick sample:
4.1, 4.3, 4.8, 5.2, 5.9, 6.4

Or CSV:
2026-03-01,4.1
2026-03-02,4.3
2026-03-03,4.8`}
                className="min-h-[220px] w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
              {mockInputError && (
                <p className="mt-2 text-sm font-medium text-rose-600">{mockInputError}</p>
              )}
              {mockInputInfo && !mockInputError && (
                <p className="mt-2 text-sm font-medium text-emerald-600">{mockInputInfo}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Quick Tips
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <li>
                  Paste exactly 180 values if you want to match the judging scenario closely.
                </li>
                <li>
                  If you only enter numbers, the system will auto-generate sequential dates.
                </li>
                <li>
                  When mock data is active, switching members only changes the target name, not the dataset.
                </li>
                <li>
                  Reload reapplies the current mock set; <span className="font-semibold">Reset to Demo</span> restores live demo data.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
              Average Task Lead Time — {developerName}
            </p>
            <p className="text-xs text-slate-400">
              {rawData.length} days of {dataSource === "mock" ? "custom" : "recent"} data (hours/task)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === "mock" && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                Mock Data
              </span>
            )}
            {result && (
              <span className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                <AlertTriangle className="h-3 w-3" />
                Day {result.startDay} → {result.endDay}
              </span>
            )}
          </div>
        </div>

        {loadingData ? (
          <div className="flex h-72 items-center justify-center rounded-lg bg-slate-50">
            <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
          </div>
        ) : !mounted ? (
          <div className="h-72 rounded-lg bg-slate-50" />
        ) : (
          <>
            <div ref={chartHostRef} className="relative w-full">
              {hoveredPoint && (
                <div
                  className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
                  style={{
                    left: hoveredPoint.x,
                    top: Math.max(8, hoveredPoint.y - 62),
                  }}
                >
                  <p className="font-bold text-slate-800">
                    Day {hoveredPoint.row.day} · {hoveredPoint.row.date}
                  </p>
                  <p className="mt-1 text-slate-700">
                    Lead time: <strong>{hoveredPoint.row.leadTime}h</strong>
                  </p>
                  {hoveredPoint.row.trendline !== null && (
                    <p className="text-red-500">Trend: {hoveredPoint.row.trendline}h</p>
                  )}
                </div>
              )}
              <div ref={chartScrollRef} className="overflow-x-auto">
                <svg
                  width={chartWidth}
                  height={chartHeight}
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="overflow-visible"
                  role="img"
                  aria-label={`180-day lead time chart for ${developerName}`}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {yTicks.map((tick) => {
                    const y = getY(tick);
                    return (
                      <g key={`tick-${tick}`}>
                        <line
                          x1={paddingLeft}
                          x2={chartWidth - paddingRight}
                          y1={y}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="10"
                          fill="#94a3b8"
                        >
                          {tick}h
                        </text>
                      </g>
                    );
                  })}

                  {highlightedStartX !== null && highlightedEndX !== null && (
                    <>
                      <rect
                        x={highlightedStartX}
                        y={paddingTop}
                        width={Math.max(0, highlightedEndX - highlightedStartX)}
                        height={plotHeight}
                        fill="#fb923c"
                        fillOpacity="0.12"
                      />
                      <line
                        x1={highlightedStartX}
                        x2={highlightedStartX}
                        y1={paddingTop}
                        y2={paddingTop + plotHeight}
                        stroke="#f97316"
                        strokeDasharray="4 3"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={highlightedEndX}
                        x2={highlightedEndX}
                        y1={paddingTop}
                        y2={paddingTop + plotHeight}
                        stroke="#ef4444"
                        strokeDasharray="4 3"
                        strokeWidth="1.5"
                      />
                    </>
                  )}

                  <line
                    x1={paddingLeft}
                    x2={chartWidth - paddingRight}
                    y1={paddingTop + plotHeight}
                    y2={paddingTop + plotHeight}
                    stroke="#cbd5e1"
                  />

                  {chartData.map((row, index) => {
                    const x = getBarX(index);
                    const y = getY(row.leadTime);
                    const height = Math.max(1, paddingTop + plotHeight - y);
                    const hitX = paddingLeft + index * stepX;
                    return (
                      <g key={`bar-${row.day}`}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="2"
                          fill={row.barColor}
                          fillOpacity={row.trendline != null ? 1 : 0.58}
                        >
                          <title>{`Day ${row.day} - ${row.date}: ${row.leadTime}h`}</title>
                        </rect>
                        <rect
                          x={hitX}
                          y={paddingTop}
                          width={Math.max(stepX, 8)}
                          height={plotHeight}
                          fill="transparent"
                          onMouseEnter={() => {
                            setHoveredPoint({
                              row,
                              x: resolveTooltipX(index),
                              y,
                            });
                          }}
                          onMouseMove={() => {
                            setHoveredPoint({
                              row,
                              x: resolveTooltipX(index),
                              y,
                            });
                          }}
                        />
                        {index % Math.max(1, Math.floor(chartData.length / 14)) === 0 && (
                          <text
                            x={getCenterX(index)}
                            y={chartHeight - 8}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#94a3b8"
                          >
                            {`N${row.day}`}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {trendPath && (
                    <path
                      d={trendPath}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Projection: dashed line extending 10 days beyond burnout zone */}
                  {result && regressionSlope > 0 && (() => {
                    const projStart = result.endIndex;
                    const projEnd = Math.min(chartData.length - 1, result.endIndex + 10);
                    if (projStart >= chartData.length - 1) return null;
                    const x1 = getCenterX(projStart);
                    const y1 = getY(regressionSlope * projStart + regressionIntercept);
                    const x2 = getCenterX(projEnd);
                    const y2 = getY(regressionSlope * projEnd + regressionIntercept);
                    return (
                      <g>
                        <line
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#dc2626"
                          strokeWidth="2"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                          opacity="0.55"
                        />
                        <text
                          x={x2 + 4}
                          y={y2 - 4}
                          fontSize="9"
                          fill="#dc2626"
                          opacity="0.8"
                        >
                          {(regressionSlope * projEnd + regressionIntercept).toFixed(1)}h?
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-slate-400 opacity-50" />
                Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-orange-400" />
                Warning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500" />
                Critical
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="24" height="8">
                  <line x1="0" y1="4" x2="24" y2="4" stroke="#dc2626" strokeWidth="2.5" />
                </svg>
                Trendline
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Result Banner ── */}
      <div ref={resultRef}>
        {result && <ResultBanner result={result} slope={regressionSlope} />}
      </div>

      {/* ── Trend Projection ── */}
      {result && regressionSlope > 0 && (
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-red-900">Trend Projection</h3>
            <span className="ml-auto rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              ML
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-red-100 bg-white px-4 py-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Daily Increase</p>
              <p className="mt-1 text-xl font-black text-red-700">+{regressionSlope.toFixed(3)}h</p>
              <p className="text-[10px] text-slate-400">additional lead time per day</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-white px-4 py-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Baseline Level</p>
              <p className="mt-1 text-xl font-black text-slate-700">{regressionIntercept.toFixed(2)}h</p>
              <p className="text-[10px] text-slate-400">intercept of the fitted trend</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-white px-4 py-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Projected Lead Time on Day {result.endDay + 7}
              </p>
              <p className="mt-1 text-2xl font-black text-orange-700">
                {(regressionSlope * (result.endIndex + 7) + regressionIntercept).toFixed(1)}h
              </p>
              <p className="text-[10px] text-slate-400">if no intervention happens</p>
            </div>
          </div>

          <p className="mt-3 text-xs font-medium text-red-700">
            Lead time is rising by about {regressionSlope.toFixed(3)} hours per day. Early intervention is recommended before the trend worsens.
          </p>
        </div>
      )}

      {/* ── AI Slack ── */}
      {(result || aiLoading) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Intervention Suggestion — Manager Message</h3>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              AI
            </span>
            {coffeeTime && result && (
              <span className="ml-auto flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Coffee className="h-3 w-3" />
                Meet at {coffeeTime}
              </span>
            )}
          </div>
          <SlackMessage message={aiMessage} developerName={developerName} isLoading={aiLoading} />

          {/* Slack Webhook sender */}
          {aiMessage && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-600">Send through real Slack</p>
              <p className="mb-3 text-[11px] text-slate-400">
                Create an Incoming Webhook at{" "}
                <span className="font-medium text-violet-600">api.slack.com/apps</span>{" "}
                → choose your app → Incoming Webhooks → Add New Webhook, then paste the URL here.
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
                  aria-label="Send to Slack"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#4a154b] px-4 text-xs font-bold text-white hover:bg-[#611f69] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {slackSending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  Send to Slack
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
