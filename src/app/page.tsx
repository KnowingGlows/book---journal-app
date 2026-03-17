"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import {
  format,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subMonths,
  addMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBookOpen,
  HiOutlinePencilSquare,
  HiOutlineBriefcase,
  HiOutlineClock,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTrophy,
  HiOutlineBolt,
} from "react-icons/hi2";

interface HabitData {
  wakeUp: boolean;
  sleepOnTime: boolean;
  reading: boolean;
  journal: boolean;
  workout: boolean;
  workHours: number;
  timeWasted: number;
}

const defaultHabits: HabitData = {
  wakeUp: false,
  sleepOnTime: false,
  reading: false,
  journal: false,
  workout: false,
  workHours: 0,
  timeWasted: 0,
};

const BASE_MAX = 7; // 5 habits + work(6h=1pt) + work(8h bonus target)

function calcPoints(h: HabitData): number {
  let pts = 0;
  if (h.wakeUp) pts += 1;
  if (h.sleepOnTime) pts += 1;
  if (h.reading) pts += 1;
  if (h.journal) pts += 1;
  if (h.workout) pts += 1;
  if (h.workHours >= 6) {
    pts += 1;
    const extra = h.workHours - 6;
    pts += Math.floor(extra / 2) * 0.5;
  }
  if (h.timeWasted > 60) pts -= 1;
  return Math.max(0, pts);
}

function getDayColor(pts: number, max: number): string {
  if (pts === 0) return "";
  const pct = pts / max;
  if (pct >= 0.85) return "emerald";
  if (pct >= 0.57) return "violet";
  if (pct > 0) return "amber";
  return "";
}

export default function Home() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<HabitData>(defaultHabits);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [historyData, setHistoryData] = useState<Map<string, HabitData>>(new Map());
  const [workInput, setWorkInput] = useState("");
  const [wasteInput, setWasteInput] = useState("");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateKey === format(new Date(), "yyyy-MM-dd");
  const today = new Date();

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const ref = doc(db, "users", user.uid, "habits", dateKey);
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as HabitData) : defaultHabits;
    setHabits(data);
    setWorkInput(String(data.workHours));
    setWasteInput(String(data.timeWasted));
    setLoading(false);
  }, [user, dateKey]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const snap = await getDocs(collection(db, "users", user.uid, "habits"));
    const map = new Map<string, HabitData>();
    snap.docs.forEach((d) => map.set(d.id, d.data() as HabitData));
    setHistoryData(map);
  }, [user]);

  useEffect(() => {
    fetchHabits();
    fetchHistory();
  }, [fetchHabits, fetchHistory]);

  const saveHabits = useCallback(async (updated: HabitData) => {
    if (!user) return;
    setSaving(true);
    setHabits(updated);
    await setDoc(doc(db, "users", user.uid, "habits", dateKey), updated);
    setSaving(false);
    setHistoryData((prev) => new Map(prev).set(dateKey, updated));
  }, [user, dateKey]);

  const toggleHabit = (key: keyof HabitData) => {
    saveHabits({ ...habits, [key]: !habits[key] });
  };

  const handleNumberInput = (key: "workHours" | "timeWasted", raw: string) => {
    if (key === "workHours") setWorkInput(raw);
    else setWasteInput(raw);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const val = Math.max(0, parseFloat(raw) || 0);
      saveHabits({ ...habits, [key]: val });
    }, 800);
  };

  const stepNumber = (key: "workHours" | "timeWasted", delta: number) => {
    const step = key === "timeWasted" ? 15 : 1;
    const cur = key === "workHours" ? habits.workHours : habits.timeWasted;
    const val = Math.max(0, cur + delta * step);
    if (key === "workHours") setWorkInput(String(val));
    else setWasteInput(String(val));
    saveHabits({ ...habits, [key]: val });
  };

  const points = calcPoints(habits);
  const maxPts = BASE_MAX + (habits.workHours >= 8 ? Math.floor((habits.workHours - 6) / 2) * 0.5 - 0.5 : 0);

  const habitChecks = [
    { key: "wakeUp" as const, label: "Wake Up On Time", sub: "~5 AM", icon: HiOutlineSun, color: "text-amber-400", bgActive: "bg-amber-500/10 border-amber-500/30" },
    { key: "sleepOnTime" as const, label: "Sleep On Time", sub: "~9 PM", icon: HiOutlineMoon, color: "text-indigo-400", bgActive: "bg-indigo-500/10 border-indigo-500/30" },
    { key: "reading" as const, label: "Reading", sub: "90 min", icon: HiOutlineBookOpen, color: "text-emerald-400", bgActive: "bg-emerald-500/10 border-emerald-500/30" },
    { key: "journal" as const, label: "Diary / Journal", sub: "", icon: HiOutlinePencilSquare, color: "text-violet-400", bgActive: "bg-violet-500/10 border-violet-500/30" },
    { key: "workout" as const, label: "Workout", sub: "", icon: HiOutlineBolt, color: "text-orange-400", bgActive: "bg-orange-500/10 border-orange-500/30" },
  ];

  // Calendar days
  const calStart = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-5xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Daily Habits</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {isToday ? "Today" : format(selectedDate, "EEEE")}, {format(selectedDate, "MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${isToday ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-[#1e1e22] bg-[#111113] text-zinc-400 hover:border-[#2a2a2e] hover:text-white"}`}
              >
                Today
              </button>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Score card */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                  <HiOutlineTrophy className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Score</p>
                  <p className="text-4xl font-bold text-white">
                    {loading ? "—" : points}
                    <span className="ml-1 text-lg text-zinc-600">/ {BASE_MAX}</span>
                  </p>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-[#1a1a1e]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (points / BASE_MAX) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
                  <span>0</span>
                  <span>{points >= BASE_MAX ? "Perfect day 🎯" : `${(BASE_MAX - points).toFixed(1).replace(".0", "")} to go`}</span>
                </div>
              </div>
              {saving && <span className="text-xs text-zinc-600">Saving…</span>}
            </div>
          </div>

          {/* Habits + Controls */}
          <div className="mt-6 grid grid-cols-5 gap-6">
            {/* Habit checkboxes */}
            <div className="col-span-3 space-y-3">
              {habitChecks.map((h) => {
                const active = habits[h.key];
                return (
                  <button
                    key={h.key}
                    onClick={() => toggleHabit(h.key)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-5 transition-all ${active ? h.bgActive : "border-[#1e1e22] bg-[#111113] hover:border-[#2a2a2e] hover:bg-[#161618]"}`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${active ? "bg-white/10" : "bg-[#1a1a1e]"}`}>
                      <h.icon className={`h-5 w-5 ${active ? h.color : "text-zinc-500"}`} />
                    </div>
                    <div className="text-left">
                      <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-400"}`}>{h.label}</span>
                      {h.sub && <span className={`ml-2 text-[10px] ${active ? "text-zinc-400" : "text-zinc-600"}`}>{h.sub}</span>}
                    </div>
                    <div className="ml-auto">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${active ? "border-violet-500 bg-violet-500" : "border-zinc-600"}`}>
                        {active && (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Work + Time Wasted */}
            <div className="col-span-2 space-y-3">
              {/* Work Hours */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineBriefcase className={`h-5 w-5 ${habits.workHours >= 6 ? "text-emerald-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Work Hours</p>
                    <p className="text-[10px] text-zinc-600">6h = 1pt &middot; +0.5 per extra 2h</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => stepNumber("workHours", -1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white">-</button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={workInput}
                      onChange={(e) => handleNumberInput("workHours", e.target.value)}
                      onBlur={() => setWorkInput(String(habits.workHours))}
                      className={`w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-2.5 text-center text-2xl font-bold outline-none focus:border-violet-500 ${habits.workHours >= 6 ? "text-emerald-400" : "text-zinc-300"}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">hrs</span>
                  </div>
                  <button onClick={() => stepNumber("workHours", 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white">+</button>
                </div>
                {habits.workHours >= 6 && (
                  <p className="mt-2 text-center text-xs text-emerald-400/70">+{(1 + Math.floor((habits.workHours - 6) / 2) * 0.5).toFixed(1).replace(".0", "")} pts earned</p>
                )}
              </div>

              {/* Time Wasted */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineClock className={`h-5 w-5 ${habits.timeWasted > 60 ? "text-red-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Time Wasted</p>
                    <p className="text-[10px] text-zinc-600">&gt;60 min = &minus;1pt</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => stepNumber("timeWasted", -1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white">-</button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      step={15}
                      value={wasteInput}
                      onChange={(e) => handleNumberInput("timeWasted", e.target.value)}
                      onBlur={() => setWasteInput(String(habits.timeWasted))}
                      className={`w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-2.5 text-center text-2xl font-bold outline-none focus:border-violet-500 ${habits.timeWasted > 60 ? "text-red-400" : "text-zinc-300"}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">min</span>
                  </div>
                  <button onClick={() => stepNumber("timeWasted", 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white">+</button>
                </div>
                {habits.timeWasted > 60 && <p className="mt-2 text-center text-xs text-red-400/70">&minus;1 pt penalty</p>}
                {habits.timeWasted > 0 && habits.timeWasted <= 60 && <p className="mt-2 text-center text-xs text-zinc-600">Under limit ✓</p>}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="rounded-lg border border-[#1e1e22] p-1.5 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-semibold text-white">{format(calMonth, "MMMM yyyy")}</h3>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="rounded-lg border border-[#1e1e22] p-1.5 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-600">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const data = historyData.get(key);
                const dayPts = data ? calcPoints(data) : 0;
                const isCurrentMonth = isSameMonth(day, calMonth);
                const isDayToday = isSameDay(day, today);
                const isSelected = key === dateKey;
                const colorName = data ? getDayColor(dayPts, BASE_MAX) : "";

                const bgClass = colorName === "emerald"
                  ? "bg-emerald-500/15 border-emerald-500/25"
                  : colorName === "violet"
                  ? "bg-violet-500/15 border-violet-500/25"
                  : colorName === "amber"
                  ? "bg-amber-500/15 border-amber-500/25"
                  : "bg-[#0e0e10] border-[#1a1a1e]";

                const ptColor = colorName === "emerald"
                  ? "text-emerald-400"
                  : colorName === "violet"
                  ? "text-violet-400"
                  : colorName === "amber"
                  ? "text-amber-400"
                  : "text-zinc-600";

                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedDate(day); }}
                    disabled={!isCurrentMonth}
                    className={`relative flex flex-col items-center justify-between rounded-xl border p-2 transition-all ${
                      isCurrentMonth ? `${bgClass} hover:brightness-125` : "border-transparent bg-transparent opacity-20"
                    } ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-[#111113]" : ""} ${isDayToday && !isSelected ? "ring-1 ring-violet-400/40 ring-offset-1 ring-offset-[#111113]" : ""}`}
                    style={{ minHeight: "64px" }}
                  >
                    <span className={`self-start text-[11px] font-semibold ${isDayToday ? "text-violet-400" : isCurrentMonth ? "text-zinc-400" : "text-zinc-700"}`}>
                      {format(day, "d")}
                    </span>
                    {data && isCurrentMonth && (
                      <div className="flex w-full flex-col items-center gap-0.5">
                        <span className={`text-sm font-bold ${ptColor}`}>{dayPts}</span>
                        <div className="flex gap-0.5 flex-wrap justify-center">
                          {data.wakeUp && <div className="h-1 w-1 rounded-full bg-amber-400" />}
                          {data.sleepOnTime && <div className="h-1 w-1 rounded-full bg-indigo-400" />}
                          {data.reading && <div className="h-1 w-1 rounded-full bg-emerald-400" />}
                          {data.journal && <div className="h-1 w-1 rounded-full bg-violet-400" />}
                          {data.workout && <div className="h-1 w-1 rounded-full bg-orange-400" />}
                          {data.workHours >= 6 && <div className="h-1 w-1 rounded-full bg-teal-400" />}
                        </div>
                      </div>
                    )}
                    {!data && isCurrentMonth && isSameDay(day, today) && (
                      <span className="text-[9px] text-zinc-600">today</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Wake</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" />Sleep</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Read</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Journal</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />Workout</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" />Work</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" />Low</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-violet-500/40" />Good</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" />Great</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </AuthGuard>
  );
}
