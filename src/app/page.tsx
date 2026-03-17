"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { format, subDays, addDays } from "date-fns";
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

function calcPoints(h: HabitData): number {
  let pts = 0;
  if (h.wakeUp) pts += 1;
  if (h.sleepOnTime) pts += 1;
  if (h.reading) pts += 1;
  if (h.journal) pts += 1;
  if (h.workout) pts += 1;
  // Work: 6hrs = 1pt, each extra 2hrs = +0.5
  if (h.workHours >= 6) {
    pts += 1;
    const extra = h.workHours - 6;
    pts += Math.floor(extra / 2) * 0.5;
  }
  // Time wasted > 60 min = -1
  if (h.timeWasted > 60) pts -= 1;
  return Math.max(0, pts);
}

function getMaxPoints(h: HabitData): number {
  let max = 5; // 5 checkboxes
  if (h.workHours >= 6) {
    max += 1;
    max += Math.floor((h.workHours - 6) / 2) * 0.5;
  }
  return max;
}

export default function Home() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<HabitData>(defaultHabits);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyRange, setHistoryRange] = useState<7 | 30 | 90>(7);
  const [historyData, setHistoryData] = useState<Map<string, HabitData>>(new Map());

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateKey === format(new Date(), "yyyy-MM-dd");

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const ref = doc(db, "users", user.uid, "habits", dateKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setHabits(snap.data() as HabitData);
    } else {
      setHabits(defaultHabits);
    }
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

  const saveHabits = async (updated: HabitData) => {
    if (!user) return;
    setSaving(true);
    setHabits(updated);
    await setDoc(doc(db, "users", user.uid, "habits", dateKey), updated);
    setSaving(false);
    setHistoryData((prev) => new Map(prev).set(dateKey, updated));
  };

  const toggleHabit = (key: keyof HabitData) => {
    const updated = { ...habits, [key]: !habits[key] };
    saveHabits(updated);
  };

  const updateNumber = (key: "workHours" | "timeWasted", value: number) => {
    const updated = { ...habits, [key]: Math.max(0, value) };
    saveHabits(updated);
  };

  const points = calcPoints(habits);
  const maxPts = getMaxPoints(habits);

  const habitChecks = [
    { key: "wakeUp" as const, label: "Wake Up On Time", sub: "", icon: HiOutlineSun, color: "text-amber-400", bgActive: "bg-amber-500/10 border-amber-500/30" },
    { key: "sleepOnTime" as const, label: "Sleep On Time", sub: "", icon: HiOutlineMoon, color: "text-indigo-400", bgActive: "bg-indigo-500/10 border-indigo-500/30" },
    { key: "reading" as const, label: "Reading", sub: "90 min", icon: HiOutlineBookOpen, color: "text-emerald-400", bgActive: "bg-emerald-500/10 border-emerald-500/30" },
    { key: "journal" as const, label: "Diary / Journal", sub: "", icon: HiOutlinePencilSquare, color: "text-violet-400", bgActive: "bg-violet-500/10 border-violet-500/30" },
    { key: "workout" as const, label: "Workout", sub: "", icon: HiOutlineBolt, color: "text-orange-400", bgActive: "bg-orange-500/10 border-orange-500/30" },
  ];

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-5xl">
          {/* Header with date nav */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Daily Habits</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {isToday ? "Today" : format(selectedDate, "EEEE")}, {format(selectedDate, "MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white"
              >
                <HiOutlineChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  isToday
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                    : "border-[#1e1e22] bg-[#111113] text-zinc-400 hover:border-[#2a2a2e] hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white"
              >
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
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Today&apos;s Score</p>
                  <p className="text-4xl font-bold text-white">
                    {loading ? "..." : points}
                    <span className="ml-1 text-lg text-zinc-600">/ {maxPts > 4 ? maxPts : 5}</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-[#1a1a1e]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (points / (maxPts > 4 ? maxPts : 5)) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
                  <span>0</span>
                  <span>{points >= (maxPts > 4 ? maxPts : 5) ? "Perfect day!" : `${(maxPts > 4 ? maxPts : 5) - points} to go`}</span>
                </div>
              </div>
              {saving && <span className="text-xs text-zinc-600">Saving...</span>}
            </div>
          </div>

          {/* Main grid: habits + work/waste side by side */}
          <div className="mt-6 grid grid-cols-5 gap-6">
            {/* Habit checkboxes - left side, 3 cols */}
            <div className="col-span-3 space-y-3">
              {habitChecks.map((h) => {
                const active = habits[h.key];
                return (
                  <button
                    key={h.key}
                    onClick={() => toggleHabit(h.key)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-5 transition-all ${
                      active
                        ? h.bgActive
                        : "border-[#1e1e22] bg-[#111113] hover:border-[#2a2a2e] hover:bg-[#161618]"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                        active ? "bg-white/10" : "bg-[#1a1a1e]"
                      }`}
                    >
                      <h.icon className={`h-5 w-5 ${active ? h.color : "text-zinc-500"}`} />
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-400"}`}>
                        {h.label}
                      </span>
                      {h.sub && <span className={`ml-2 text-[10px] ${active ? "text-zinc-400" : "text-zinc-600"}`}>{h.sub}</span>}
                    </div>

                    {/* Checkbox */}
                    <div className="ml-auto">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${
                          active
                            ? "border-violet-500 bg-violet-500"
                            : "border-zinc-600"
                        }`}
                      >
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

            {/* Work + Time Wasted - right side, 2 cols */}
            <div className="col-span-2 space-y-3">
              {/* Work Hours */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineBriefcase className={`h-5 w-5 ${habits.workHours >= 6 ? "text-emerald-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Work Hours</p>
                    <p className="text-[10px] text-zinc-600">6h = 1pt, +0.5 per extra 2h</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => updateNumber("workHours", habits.workHours - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className={`text-3xl font-bold ${habits.workHours >= 6 ? "text-emerald-400" : "text-zinc-300"}`}>
                      {habits.workHours}
                    </span>
                    <span className="ml-1.5 text-sm text-zinc-500">hrs</span>
                  </div>
                  <button
                    onClick={() => updateNumber("workHours", habits.workHours + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white"
                  >
                    +
                  </button>
                </div>
                {habits.workHours >= 6 && (
                  <p className="mt-2 text-center text-xs text-emerald-400/70">
                    +{1 + Math.floor((habits.workHours - 6) / 2) * 0.5} pts
                  </p>
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
                    <p className="text-[10px] text-zinc-600">&gt;60 min = -1pt</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => updateNumber("timeWasted", habits.timeWasted - 15)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className={`text-3xl font-bold ${habits.timeWasted > 60 ? "text-red-400" : "text-zinc-300"}`}>
                      {habits.timeWasted}
                    </span>
                    <span className="ml-1.5 text-sm text-zinc-500">min</span>
                  </div>
                  <button
                    onClick={() => updateNumber("timeWasted", habits.timeWasted + 15)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 transition-all hover:border-[#3a3a3e] hover:text-white"
                  >
                    +
                  </button>
                </div>
                {habits.timeWasted > 60 && (
                  <p className="mt-2 text-center text-xs text-red-400/70">-1 pt</p>
                )}
                {habits.timeWasted > 0 && habits.timeWasted <= 60 && (
                  <p className="mt-2 text-center text-xs text-zinc-500">Under limit, no penalty</p>
                )}
              </div>
            </div>
          </div>

          {/* History overview */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">History</h3>
              <div className="flex gap-1 rounded-lg bg-[#0a0a0c] p-1">
                {([7, 30, 90] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setHistoryRange(range)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      historyRange === range
                        ? "bg-[#1a1a1e] text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {range === 90 ? "3M" : `${range}D`}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar grid */}
            <div className={`mt-4 grid gap-1.5 ${historyRange === 7 ? "grid-cols-7" : historyRange === 30 ? "grid-cols-10" : "grid-cols-15"}`}
              style={historyRange === 90 ? { gridTemplateColumns: "repeat(15, minmax(0, 1fr))" } : undefined}
            >
              {Array.from({ length: historyRange }, (_, i) => {
                const day = subDays(new Date(), historyRange - 1 - i);
                const key = format(day, "yyyy-MM-dd");
                const data = historyData.get(key);
                const dayPts = data ? calcPoints(data) : 0;
                const dayMax = data ? Math.max(getMaxPoints(data), 6) : 6;
                const isDayToday = key === format(new Date(), "yyyy-MM-dd");
                const isSelected = key === dateKey;
                const pct = data ? dayPts / dayMax : 0;

                // Color based on score
                const bg = !data
                  ? "bg-[#1a1a1e]"
                  : pct >= 0.8
                  ? "bg-emerald-500"
                  : pct >= 0.5
                  ? "bg-violet-500"
                  : pct > 0
                  ? "bg-amber-500"
                  : "bg-[#1a1a1e]";

                const opacity = !data ? "" : pct >= 0.8 ? "opacity-100" : pct >= 0.5 ? "opacity-80" : pct > 0 ? "opacity-60" : "";

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    title={`${format(day, "MMM d")} — ${data ? `${dayPts} pts` : "No data"}`}
                    className={`group relative aspect-square rounded-md ${bg} ${opacity} transition-all ${
                      isSelected ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-[#111113]" : "hover:ring-1 hover:ring-zinc-600"
                    } ${isDayToday ? "ring-1 ring-violet-400/50" : ""}`}
                  >
                    {historyRange === 7 && (
                      <div className="flex h-full flex-col items-center justify-center">
                        <span className={`text-[9px] font-medium uppercase ${isDayToday ? "text-violet-400" : "text-zinc-500"}`}>
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-[10px] ${isDayToday ? "text-white" : "text-zinc-400"}`}>
                          {format(day, "d")}
                        </span>
                        {data && <span className="mt-0.5 text-xs font-bold text-white">{dayPts}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-zinc-500">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-sm bg-[#1a1a1e]" />
                <div className="h-3 w-3 rounded-sm bg-amber-500 opacity-60" />
                <div className="h-3 w-3 rounded-sm bg-violet-500 opacity-80" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
