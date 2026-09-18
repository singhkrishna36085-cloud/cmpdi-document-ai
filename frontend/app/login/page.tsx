"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import { 
  User, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Building2,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("NORMAL_USER");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim()) {
      setErrorMessage("Please enter your Username or Email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(usernameOrEmail, password, selectedRole);

      if (result.success) {
        window.location.href = "/";
      } else {
        setErrorMessage(result.message || "Authentication failed. Please check your credentials.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header / Branding Bar */}
      <header className="w-full border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-xl shadow-md shadow-blue-600/30">
            K
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              KHANI GYAN AI
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
                <Sparkles className="h-3 w-3" /> Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              AI-Assisted Geological, Mining & Production Reporting Platform
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-500" /> CIL Enterprise Network
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" /> RBAC Protected
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
            {/* Header section */}
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sign in to your Portal
              </h2>
              <p className="text-sm text-slate-400">
                Access Geological, Mining & Production AI Intelligence
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-6 rounded-xl bg-red-950/50 border border-red-800/60 p-4 text-xs text-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select System Role
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("NORMAL_USER")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedRole === "NORMAL_USER"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Normal User
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("HOD")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedRole === "HOD"
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    HOD Admin
                  </button>
                </div>
              </div>

              {/* Username or Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-medium text-slate-300">
                  Username or Official Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="cmpdi_admin or user@cmpdi.co.in"
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your security password"
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Authenticating credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Khani Gyan AI</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-medium text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400" /> Security & Role Verification
            </div>
            <p className="leading-relaxed text-slate-400">
              Backend Role-Based Access Control (RBAC) enforces strict authorization at the API level. Accounts are assigned either <span className="text-slate-200 font-medium">Head of Department (HOD)</span> or <span className="text-slate-200 font-medium">Normal User</span> access.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        © 2026 KhaniGyan-AI. All Rights Reserved. Authorized Personnel Only.
      </footer>
    </div>
  );
}


