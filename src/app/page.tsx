"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
} from "react-icons/hi2";

interface HabitData {
  wakeUp: boolean;
  sleepOnTime: boolean;
  reading: boolean;
  journal: boolean;
  workHours: number;
  timeWasted: number;
}

const defaultHabits: HabitData = {
  wakeUp: false,
  sleepOnTime: false,
  reading: false,
  journal: false,
  workHours: 0,
  timeWasted: 0,
};

function calcPoints(h: HabitData): number {
  let pts = 0;
  if (h.wakeUp) pts += 1;
  if (h.sleepOnTime) pts += 1;
  if (h.reading) pts += 1;
  if (h.journal) pts += 1;
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
  let max = 4; // 4 checkboxes
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
  const [weekData, setWeekData] = useState<(HabitData | null)[]>([]);

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

  const fetchWeek = useCallback(async () => {
    if (!user) return;
    const days: (HabitData | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(selectedDate, i);
      const key = format(d, "yyyy-MM-dd");
      const snap = await getDoc(doc(db, "users", user.uid, "habits", key));
      days.push(snap.exists() ? (snap.data() as HabitData) : null);
    }
    setWeekData(days);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchHabits();
    fetchWeek();
  }, [fetchHabits, fetchWeek]);

  const saveHabits = async (updated: HabitData) => {
    if (!user) return;
    setSaving(true);
    setHabits(updated);
    await setDoc(doc(db, "users", user.uid, "habits", dateKey), updated);
    setSaving(false);
    fetchWeek();
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
    { key: "wakeUp" as const, label: "Wake Up On Time", icon: HiOutlineSun, color: "text-amber-400", bgActive: "bg-amber-500/10 border-amber-500/30" },
    { key: "sleepOnTime" as const, label: "Sleep On Time", icon: HiOutlineMoon, color: "text-indigo-400", bgActive: "bg-indigo-500/10 border-indigo-500/30" },
    { key: "reading" as const, label: "Reading", icon: HiOutlineBookOpen, color: "text-emerald-400", bgActive: "bg-emerald-500/10 border-emerald-500/30" },
    { key: "journal" as const, label: "Diary / Journal", icon: HiOutlinePencilSquare, color: "text-violet-400", bgActive: "bg-violet-500/10 border-violet-500/30" },
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => subDays(selectedDate, 6 - i));

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
                    <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-400"}`}>
                      {h.label}
                    </span>

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

          {/* Weekly overview */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <h3 className="text-sm font-semibold text-white">Last 7 Days</h3>
            <div className="mt-4 grid grid-cols-7 gap-3">
              {weekDays.map((day, i) => {
                const data = weekData[i];
                const dayPts = data ? calcPoints(data) : 0;
                const dayMax = data ? getMaxPoints(data) : 5;
                const isDayToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isSelected = format(day, "yyyy-MM-dd") === dateKey;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-violet-500/30 bg-violet-500/10"
                        : "border-[#1e1e22] hover:border-[#2a2a2e] hover:bg-[#161618]"
                    }`}
                  >
                    <span className={`text-[10px] font-medium uppercase ${isDayToday ? "text-violet-400" : "text-zinc-500"}`}>
                      {format(day, "EEE")}
                    </span>
                    <span className={`mt-0.5 text-xs ${isDayToday ? "text-white" : "text-zinc-400"}`}>
                      {format(day, "d")}
                    </span>
                    {data ? (
                      <>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1e]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              dayPts >= (dayMax > 4 ? dayMax : 5) ? "bg-emerald-500" : dayPts >= 3 ? "bg-violet-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, (dayPts / (dayMax > 4 ? dayMax : 5)) * 100)}%` }}
                          />
                        </div>
                        <span className="mt-1 text-xs font-bold text-zinc-300">{dayPts}</span>
                      </>
                    ) : (
                      <>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-[#1a1a1e]" />
                        <span className="mt-1 text-xs text-zinc-600">-</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
