"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import {
  format, subDays, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, subMonths, addMonths,
  isSameMonth, isSameDay, isSunday, getDay,
} from "date-fns";
import {
  HiOutlineSun, HiOutlineMoon, HiOutlineBookOpen, HiOutlinePencilSquare,
  HiOutlineBriefcase, HiOutlineClock, HiOutlineChevronLeft,
  HiOutlineChevronRight, HiOutlineTrophy, HiOutlineBolt, HiOutlineSparkles,
} from "react-icons/hi2";

interface HabitData {
  wakeUp: boolean;
  sleepOnTime: boolean;
  meditation: boolean;
  journalSunday: boolean;
  workout: boolean;
  readingMins: number;
  workMins: number;
  timeWasted: number;
}

const defaultHabits: HabitData = {
  wakeUp: false, sleepOnTime: false, meditation: false,
  journalSunday: false, workout: false,
  readingMins: 0, workMins: 0, timeWasted: 0,
};

function dayMax(): number {
  return 7;
}

function calcPoints(h: HabitData, date?: Date): number {
  let pts = 0;
  if (h.wakeUp) pts += 1;
  if (h.sleepOnTime) pts += 1;
  if (h.meditation) pts += 1;
  if (h.workout) pts += 1;
  // Sunday journal
  if (date && isSunday(date) && h.journalSunday) pts += 1;
  // Reading: 1h30m = 1pt, +0.5 per extra 30m
  if (h.readingMins >= 90) {
    pts += 1;
    pts += Math.floor((h.readingMins - 90) / 30) * 0.5;
  }
  // Work: 4h = 1pt, +0.5 per extra 1h
  if (h.workMins >= 240) {
    pts += 1;
    pts += Math.floor((h.workMins - 240) / 60) * 0.5;
  }
  // Time wasted: ≤1h = +1pt, each 30m above 1h = -1pt
  if (h.timeWasted <= 60) {
    pts += 1;
  } else {
    pts -= Math.floor((h.timeWasted - 60) / 30);
  }
  return pts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(raw: any): HabitData {
  return {
    wakeUp: raw.wakeUp ?? false,
    sleepOnTime: raw.sleepOnTime ?? false,
    meditation: raw.meditation ?? false,
    journalSunday: raw.journalSunday ?? raw.journal ?? false,
    workout: raw.workout ?? false,
    readingMins: raw.readingMins ?? (raw.reading ? 90 : 0),
    workMins: raw.workMins ?? Math.round((raw.workHours ?? 0) * 60),
    timeWasted: raw.timeWasted ?? 0,
  };
}

function fmtMins(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDayColor(pts: number, max: number): string {
  if (pts === 0) return "";
  const pct = pts / max;
  if (pct >= 0.85) return "emerald";
  if (pct >= 0.57) return "violet";
  return "amber";
}

function TimeInput({
  totalMins, onChange, threshold, color = "emerald",
  stepMins = 15, label,
}: {
  totalMins: number;
  onChange: (mins: number) => void;
  threshold: number;
  color?: string;
  stepMins?: number;
  label?: string;
}) {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const met = totalMins >= threshold;
  const textColor = met ? `text-${color}-400` : "text-zinc-300";
  const inputCls = `w-12 bg-transparent text-center text-xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${textColor}`;

  const setHrs = (v: number) => onChange(Math.max(0, v) * 60 + mins);
  const setMins = (v: number) => onChange(hrs * 60 + Math.max(0, Math.min(59, v)));
  const step = (delta: number) => onChange(Math.max(0, totalMins + delta * stepMins));

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <button onClick={() => step(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 hover:border-[#3a3a3e] hover:text-white transition-all">−</button>
        <div className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#27272a] bg-[#1a1a1e] px-3 py-2.5">
          <input type="number" min={0} value={hrs} onChange={(e) => setHrs(parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={inputCls} />
          <span className="text-sm text-zinc-500">h</span>
          <input type="number" min={0} max={59} value={mins} onChange={(e) => setMins(parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={inputCls} />
          <span className="text-sm text-zinc-500">m</span>
        </div>
        <button onClick={() => step(1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#1a1a1e] text-lg font-bold text-zinc-400 hover:border-[#3a3a3e] hover:text-white transition-all">+</button>
      </div>
      {label && totalMins > 0 && (
        <p className={`mt-1.5 text-center text-xs ${met ? `text-${color}-400/70` : "text-zinc-600"}`}>{label}</p>
      )}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<HabitData>(defaultHabits);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [historyData, setHistoryData] = useState<Map<string, HabitData>>(new Map());
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateKey === format(new Date(), "yyyy-MM-dd");
  const today = new Date();
  const isSun = isSunday(selectedDate);
  const todayMax = dayMax();

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const snap = await getDoc(doc(db, "users", user.uid, "habits", dateKey));
    setHabits(snap.exists() ? migrate(snap.data()) : defaultHabits);
    setLoading(false);
  }, [user, dateKey]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const snap = await getDocs(collection(db, "users", user.uid, "habits"));
    const map = new Map<string, HabitData>();
    snap.docs.forEach((d) => map.set(d.id, migrate(d.data())));
    setHistoryData(map);
  }, [user]);

  useEffect(() => { fetchHabits(); fetchHistory(); }, [fetchHabits, fetchHistory]);

  const saveHabits = useCallback(async (updated: HabitData) => {
    if (!user) return;
    setSaving(true);
    setHabits(updated);
    await setDoc(doc(db, "users", user.uid, "habits", dateKey), updated);
    setSaving(false);
    setHistoryData((prev) => new Map(prev).set(dateKey, updated));
  }, [user, dateKey]);

  const debouncedSave = useCallback((updated: HabitData) => {
    setHabits(updated);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      if (!user) return;
      await setDoc(doc(db, "users", user.uid, "habits", dateKey), updated);
      setSaving(false);
      setHistoryData((prev) => new Map(prev).set(dateKey, updated));
    }, 600);
  }, [user, dateKey]);

  const toggleHabit = (key: "wakeUp" | "sleepOnTime" | "meditation" | "workout" | "journalSunday") =>
    saveHabits({ ...habits, [key]: !habits[key] });

  const points = calcPoints(habits, selectedDate);

  const habitChecks = [
    { key: "wakeUp" as const, label: "Wake Up On Time", sub: "~5 AM", icon: HiOutlineSun, color: "text-amber-400", bgActive: "bg-amber-500/10 border-amber-500/30" },
    { key: "sleepOnTime" as const, label: "Sleep On Time", sub: "~9 PM", icon: HiOutlineMoon, color: "text-indigo-400", bgActive: "bg-indigo-500/10 border-indigo-500/30" },
    { key: "meditation" as const, label: "Meditation", sub: "", icon: HiOutlineSparkles, color: "text-pink-400", bgActive: "bg-pink-500/10 border-pink-500/30" },
    { key: "workout" as const, label: "Workout", sub: "", icon: HiOutlineBolt, color: "text-orange-400", bgActive: "bg-orange-500/10 border-orange-500/30" },
  ];

  // Weekly totals
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let weekPts = 0;
  let weekMax = 0;
  let weekDaysTracked = 0;
  weekDays.forEach((day) => {
    const k = format(day, "yyyy-MM-dd");
    const data = historyData.get(k);
    weekMax += dayMax();
    if (data) {
      weekPts += calcPoints(data, day);
      weekDaysTracked++;
    }
  });

  // Previous week for comparison
  const prevWeekStart = subDays(weekStart, 7);
  const prevWeekEnd = subDays(weekEnd, 7);
  const prevWeekDays = eachDayOfInterval({ start: prevWeekStart, end: prevWeekEnd });
  let prevWeekPts = 0;
  prevWeekDays.forEach((day) => {
    const k = format(day, "yyyy-MM-dd");
    const data = historyData.get(k);
    if (data) prevWeekPts += calcPoints(data, day);
  });
  const weekDelta = weekPts - prevWeekPts;

  const calStart = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const workPts = habits.workMins >= 240 ? 1 + Math.floor((habits.workMins - 240) / 60) * 0.5 : 0;
  const readPts = habits.readingMins >= 90 ? 1 + Math.floor((habits.readingMins - 90) / 30) * 0.5 : 0;
  const wastePenalty = habits.timeWasted > 60 ? Math.floor((habits.timeWasted - 60) / 30) : 0;

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
                {isSun && <span className="ml-2 rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">Journal Day</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${isToday ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-[#1e1e22] bg-[#111113] text-zinc-400 hover:border-[#2a2a2e] hover:text-white"}`}>
                Today
              </button>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-2 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Score */}
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
                    <span className="ml-1 text-lg text-zinc-600">/ {todayMax}</span>
                  </p>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-[#1a1a1e]">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500" style={{ width: `${Math.min(100, (points / todayMax) * 100)}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
                  <span>0</span>
                  <span>{points >= todayMax ? "Perfect day" : `${(todayMax - points).toFixed(1).replace(".0", "")} to go`}</span>
                </div>
              </div>
              {saving && <span className="text-xs text-zinc-600">Saving…</span>}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-6 grid grid-cols-5 gap-6">
            {/* Checkboxes */}
            <div className="col-span-3 space-y-3">
              {habitChecks.map((h) => {
                const active = habits[h.key];
                return (
                  <button key={h.key} onClick={() => toggleHabit(h.key)}
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
                        {active && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Sunday-only Journal */}
              {isSun && (
                <button onClick={() => toggleHabit("journalSunday")}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-5 transition-all ${habits.journalSunday ? "bg-violet-500/10 border-violet-500/30" : "border-[#1e1e22] bg-[#111113] hover:border-[#2a2a2e] hover:bg-[#161618]"}`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${habits.journalSunday ? "bg-white/10" : "bg-[#1a1a1e]"}`}>
                    <HiOutlinePencilSquare className={`h-5 w-5 ${habits.journalSunday ? "text-violet-400" : "text-zinc-500"}`} />
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-medium ${habits.journalSunday ? "text-white" : "text-zinc-400"}`}>Weekly Journal</span>
                    <span className={`ml-2 text-[10px] ${habits.journalSunday ? "text-zinc-400" : "text-zinc-600"}`}>Sundays only</span>
                  </div>
                  <div className="ml-auto">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${habits.journalSunday ? "border-violet-500 bg-violet-500" : "border-zinc-600"}`}>
                      {habits.journalSunday && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Time trackers */}
            <div className="col-span-2 space-y-3">
              {/* Reading */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineBookOpen className={`h-5 w-5 ${habits.readingMins >= 90 ? "text-emerald-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Reading</p>
                    <p className="text-[10px] text-zinc-600">1h 30m = 1pt · +0.5 per extra 30m</p>
                  </div>
                  {habits.readingMins > 0 && <span className="ml-auto text-xs text-zinc-500">{fmtMins(habits.readingMins)}</span>}
                </div>
                <TimeInput totalMins={habits.readingMins} onChange={(v) => debouncedSave({ ...habits, readingMins: v })} threshold={90} color="emerald" stepMins={15}
                  label={readPts > 0 ? `+${readPts} pt${readPts !== 1 ? "s" : ""} earned` : habits.readingMins > 0 ? `${fmtMins(90 - habits.readingMins)} to go` : undefined} />
              </div>

              {/* Work */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineBriefcase className={`h-5 w-5 ${habits.workMins >= 240 ? "text-teal-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Work</p>
                    <p className="text-[10px] text-zinc-600">4h = 1pt · +0.5 per extra 1h</p>
                  </div>
                  {habits.workMins > 0 && <span className="ml-auto text-xs text-zinc-500">{fmtMins(habits.workMins)}</span>}
                </div>
                <TimeInput totalMins={habits.workMins} onChange={(v) => debouncedSave({ ...habits, workMins: v })} threshold={240} color="teal" stepMins={30}
                  label={workPts > 0 ? `+${workPts} pt${workPts !== 1 ? "s" : ""} earned` : habits.workMins > 0 ? `${fmtMins(240 - habits.workMins)} to go` : undefined} />
              </div>

              {/* Time Wasted */}
              <div className="rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1e]">
                    <HiOutlineClock className={`h-5 w-5 ${habits.timeWasted > 60 ? "text-red-400" : "text-zinc-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Time Wasted</p>
                    <p className="text-[10px] text-zinc-600">≤1h = +1pt · -1 per 30m over</p>
                  </div>
                  {habits.timeWasted > 0 && <span className="ml-auto text-xs text-zinc-500">{fmtMins(habits.timeWasted)}</span>}
                </div>
                <TimeInput totalMins={habits.timeWasted} onChange={(v) => debouncedSave({ ...habits, timeWasted: v })} threshold={0} color="red" stepMins={15}
                  label={habits.timeWasted <= 60 ? "+1 pt earned ✓" : `-${wastePenalty} pt${wastePenalty !== 1 ? "s" : ""} deducted`} />
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
              </h3>
              {weekDaysTracked > 0 && (
                <span className={`text-xs font-medium ${weekDelta > 0 ? "text-emerald-400" : weekDelta < 0 ? "text-red-400" : "text-zinc-500"}`}>
                  {weekDelta > 0 ? "↑" : weekDelta < 0 ? "↓" : "→"} {weekDelta > 0 ? "+" : ""}{weekDelta} vs last week
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const k = format(day, "yyyy-MM-dd");
                const data = historyData.get(k);
                const dMax = dayMax();
                const dPts = data ? calcPoints(data, day) : 0;
                const pct = data ? dPts / dMax : 0;
                const isDayToday = isSameDay(day, today);
                const isSel = k === dateKey;
                return (
                  <button key={k} onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center rounded-xl border p-3 transition-all ${isSel ? "border-violet-500 bg-violet-500/10" : "border-[#1e1e22] hover:border-[#2a2a2e]"}`}
                  >
                    <span className={`text-[10px] font-medium uppercase ${isDayToday ? "text-violet-400" : "text-zinc-600"}`}>{format(day, "EEE")}</span>
                    <span className={`mt-1 text-lg font-bold ${!data ? "text-zinc-700" : pct >= 0.85 ? "text-emerald-400" : pct >= 0.57 ? "text-violet-400" : "text-amber-400"}`}>
                      {data ? dPts : "—"}
                    </span>
                    <span className="text-[9px] text-zinc-600">/ {dMax}</span>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#1a1a1e]">
                      <div className={`h-full rounded-full transition-all ${pct >= 0.85 ? "bg-emerald-500" : pct >= 0.57 ? "bg-violet-500" : pct > 0 ? "bg-amber-500" : ""}`}
                        style={{ width: `${pct * 100}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0a0a0c] px-4 py-3">
              <span className="text-xs text-zinc-500">Weekly Total</span>
              <span className="text-lg font-bold text-white">{weekPts} <span className="text-sm text-zinc-600">/ {weekMax}</span></span>
              <span className="text-xs text-zinc-500">{weekDaysTracked}/7 days tracked</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="rounded-lg border border-[#1e1e22] p-1.5 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-semibold text-white">{format(calMonth, "MMMM yyyy")}</h3>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="rounded-lg border border-[#1e1e22] p-1.5 text-zinc-400 transition-all hover:border-[#2a2a2e] hover:text-white">
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-600">{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const data = historyData.get(key);
                const dMax = dayMax();
                const dayPts = data ? calcPoints(data, day) : 0;
                const isCurrentMonth = isSameMonth(day, calMonth);
                const isDayToday = isSameDay(day, today);
                const isSelected = key === dateKey;
                const colorName = data ? getDayColor(dayPts, dMax) : "";
                const bgClass = colorName === "emerald" ? "bg-emerald-500/15 border-emerald-500/25" : colorName === "violet" ? "bg-violet-500/15 border-violet-500/25" : colorName === "amber" ? "bg-amber-500/15 border-amber-500/25" : "bg-[#0e0e10] border-[#1a1a1e]";
                const ptColor = colorName === "emerald" ? "text-emerald-400" : colorName === "violet" ? "text-violet-400" : colorName === "amber" ? "text-amber-400" : "text-zinc-600";
                return (
                  <button key={key} onClick={() => setSelectedDate(day)} disabled={!isCurrentMonth}
                    className={`relative flex flex-col items-center justify-between rounded-xl border p-2 transition-all ${isCurrentMonth ? `${bgClass} hover:brightness-125` : "border-transparent bg-transparent opacity-20"} ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-[#111113]" : ""} ${isDayToday && !isSelected ? "ring-1 ring-violet-400/40 ring-offset-1 ring-offset-[#111113]" : ""}`}
                    style={{ minHeight: "64px" }}
                  >
                    <span className={`self-start text-[11px] font-semibold ${isDayToday ? "text-violet-400" : isCurrentMonth ? "text-zinc-400" : "text-zinc-700"}`}>{format(day, "d")}</span>
                    {data && isCurrentMonth && (
                      <div className="flex w-full flex-col items-center gap-0.5">
                        <span className={`text-sm font-bold ${ptColor}`}>{dayPts}</span>
                        <div className="flex flex-wrap justify-center gap-0.5">
                          {data.wakeUp && <div className="h-1 w-1 rounded-full bg-amber-400" />}
                          {data.sleepOnTime && <div className="h-1 w-1 rounded-full bg-indigo-400" />}
                          {data.meditation && <div className="h-1 w-1 rounded-full bg-pink-400" />}
                          {data.readingMins >= 90 && <div className="h-1 w-1 rounded-full bg-emerald-400" />}
                          {data.workout && <div className="h-1 w-1 rounded-full bg-orange-400" />}
                          {data.workMins >= 240 && <div className="h-1 w-1 rounded-full bg-teal-400" />}
                          {isSunday(day) && data.journalSunday && <div className="h-1 w-1 rounded-full bg-violet-400" />}
                        </div>
                      </div>
                    )}
                    {!data && isCurrentMonth && isSameDay(day, today) && <span className="text-[9px] text-zinc-600">today</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Wake</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" />Sleep</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400" />Meditate</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Read</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />Workout</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" />Work</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Journal</span>
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
