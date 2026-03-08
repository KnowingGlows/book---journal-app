"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  };

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

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-violet-400 hover:text-violet-300"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
