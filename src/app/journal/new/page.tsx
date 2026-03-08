"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";

const moods = [
  { label: "Great", value: "great", color: "bg-[#022c22] text-emerald-400 border-[#064e3b]" },
  { label: "Good", value: "good", color: "bg-[#2e1065] text-violet-400 border-[#4c1d95]" },
  { label: "Okay", value: "okay", color: "bg-[#451a03] text-amber-400 border-[#78350f]" },
  { label: "Bad", value: "bad", color: "bg-[#431407] text-orange-400 border-[#7c2d12]" },
  { label: "Awful", value: "awful", color: "bg-[#450a0a] text-red-400 border-[#7f1d1d]" },
];

export default function NewJournalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("good");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
  };

  const save = async () => {
    if (!user || !title.trim() || saving) return;
    setSaving(true);
    const ref = await addDoc(collection(db, "users", user.uid, "journals"), {
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    router.push(`/journal/${ref.id}`);
  };

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-[#09090b] p-8">
        <div className="animate-fade-in max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/journal" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300">
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to Journal
            </Link>
            <button
              onClick={save}
              disabled={!title.trim() || saving}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>

          <input
            type="text"
            placeholder="Give your entry a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-none bg-transparent text-2xl font-bold text-white placeholder-zinc-700 outline-none"
            autoFocus
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  mood === m.value ? m.color : "border-[#1e1e22] text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-lg bg-[#1a1a1e] px-2.5 py-1 text-xs text-zinc-400">
                #{tag}
                <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="ml-0.5 text-zinc-600 hover:text-red-400">&times;</button>
              </span>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="+ add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="w-24 border-none bg-transparent text-xs text-zinc-500 placeholder-zinc-700 outline-none"
              />
            </div>
          </div>

          <div className="mt-6 h-px bg-[#1e1e22]" />

          <textarea
            placeholder="Start writing..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-6 min-h-[60vh] w-full resize-none border-none bg-transparent text-sm leading-relaxed text-zinc-200 placeholder-zinc-700 outline-none"
          />
        </div>
      </main>
    </AuthGuard>
  );
}
