"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const [error, setError] = useState("");
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Shelf<span className="text-violet-400">d</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">your personal book tracker & journal</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-6">
          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-[#1a1a1e] px-4 py-3 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-[#222226]"
          >
            <FcGoogle className="h-5 w-5" />
            Continue with Google
          </button>
          {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
