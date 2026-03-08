"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const [error, setError] = useState("");
  const { signInWithGoogle } = useAuth();

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Shelf<span className="text-violet-400">d</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">your personal book tracker & journal</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur">
          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800"
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
