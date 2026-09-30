"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const provider = new GoogleAuthProvider();

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      router.replace("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.replace("/dashboard");
    } catch (e: unknown) {
      const msg = (e as { code?: string; message?: string }).code;
      if (msg === "auth/user-not-found" || msg === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (msg === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (msg === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient gold blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(43 75% 60%), transparent)" }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(347 80% 70%), transparent)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E8E0D8] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Header ornament */}
          <div className="relative bg-gradient-to-br from-[#FDFBF7] to-[#F5EFE6] px-8 pt-10 pb-6 text-center border-b border-[#E8E0D8]">
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="h-px w-8 bg-[hsl(43,75%,50%)]" />
              <span style={{ color: "hsl(43,75%,50%)" }} className="text-lg">✦</span>
              <div className="h-px w-8 bg-[hsl(43,75%,50%)]" />
            </div>
            <h1 className="font-display text-3xl text-[hsl(25,30%,12%)] mb-1 tracking-wide">
              Yours Truly
            </h1>
            <p className="font-sans text-xs text-muted-foreground tracking-widest uppercase">
              Digital Wedding Invitations
            </p>
          </div>

          <div className="px-8 py-8">
            {/* Tab Toggle */}
            <div className="flex bg-[#F5EFE6] rounded-full p-1 mb-6 gap-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2 rounded-full text-sm font-sans font-semibold transition-all duration-200"
                  style={
                    mode === m
                      ? { background: "white", color: "hsl(25,30%,12%)", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }
                      : { color: "hsl(25,10%,45%)" }
                  }
                >
                  {m === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E8E0D8] bg-white hover:bg-[#FDFBF7] transition-colors font-sans text-sm font-medium text-[hsl(25,30%,12%)] mb-5 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#E8E0D8]" />
              <span className="font-sans text-xs text-muted-foreground">or with email</span>
              <div className="flex-1 h-px bg-[#E8E0D8]" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <label className="block font-sans text-xs font-semibold mb-1.5"
                  style={{ color: "hsl(43,75%,40%)" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] px-4 font-sans text-sm outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/20 placeholder:text-[hsl(25,10%,65%)]"
                />
              </div>
              <div>
                <label className="block font-sans text-xs font-semibold mb-1.5"
                  style={{ color: "hsl(43,75%,40%)" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full h-11 rounded-xl border border-[#E8E0D8] bg-[#FDFBF7] px-4 font-sans text-sm outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/20 placeholder:text-[hsl(25,10%,65%)]"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="font-sans text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full h-11 rounded-xl font-sans font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))",
                  color: "white",
                  boxShadow: "0 4px 20px hsl(43,75%,50%)/0.3",
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : mode === "signin" ? "Sign In" : "Create Account"}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center font-sans text-xs text-muted-foreground mt-5">
          <a href="/" className="hover:text-[hsl(43,75%,50%)] transition-colors">
            ← Back to Yours Truly
          </a>
        </p>
      </motion.div>
    </div>
  );
}
