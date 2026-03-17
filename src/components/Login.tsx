import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "../utils/supabaseClient";
import { Heart, Sparkles, BookOpen, Eye, EyeOff, AtSign, CheckCircle2, XCircle, Loader2, Download, X } from "lucide-react";
import { useUserData } from "../App";
import { t } from "../utils/i18n";

interface LoginProps {
  onLogin: (username: string, userId: string) => void;
  isModal?: boolean;
  onClose?: () => void;
  onViewChange?: (view: string) => void;
}

type Screen = "auth" | "choose-username";

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export function Login({ onLogin, isModal = false, onClose, onViewChange }: LoginProps) {
  const { isInstallable, showInstallPrompt } = useUserData();
  const [screen, setScreen] = useState<Screen>("auth");
  const [isSignup, setIsSignup] = useState(false);

  // ── Existing session check for incomplete profile on mount ──
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = data.session.user;
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.username) {
          setPendingUserId(user.id);
          setScreen("choose-username");
        }
      }
    };
    checkExistingSession();
  }, []);

  // Auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // Auth form loading
  const [authLoading, setAuthLoading] = useState(false);

  // After signup — pending user waiting for username
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Choose-username screen
  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameError, setUsernameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Google Sign In ──────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setAuthLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to sign in with Google");
      setAuthLoading(false);
    }
  };

  // ── Auth submit ──────────────────────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setAuthLoading(true);
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const user = data.user;
        if (!user) throw new Error("Signup failed — no user returned.");

        // Store user, move to username-picker
        setPendingUserId(user.id);
        setScreen("choose-username");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const user = data.user;
        if (!user) throw new Error("Login failed.");

        // Fetch username from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        onLogin(profile?.username || "", user.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Real-time username uniqueness check ──────────────────────
  const handleUsernameChange = async (value: string) => {
    setNewUsername(value);

    const cleaned = value.trim().toLowerCase();

    if (cleaned.length === 0) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }

    // Validate format: 3-20 chars, letters/numbers/underscores only
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
      setUsernameStatus("invalid");
      setUsernameError("3–20 chars, letters, numbers, and underscores only");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError("");

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleaned)
      .maybeSingle();

    setUsernameStatus(data ? "taken" : "available");
    setUsernameError(data ? "This username is already taken" : "");
  };

  // ── Username form submit ─────────────────────────────────────
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserId) return;
    if (usernameStatus !== "available") {
      setUsernameError("Please choose a valid, available username");
      return;
    }

    setSubmitting(true);
    const cleaned = newUsername.trim().toLowerCase();

    try {
      // Upsert into profiles — handles both brand-new and partially-created rows
      const { error: profileError } = await supabase.from("profiles").upsert(
        { id: pendingUserId, username: cleaned, full_name: cleaned },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;

      // Upsert into users (required for FK constraints)
      const { error: userError } = await supabase.from("users").upsert(
        { id: pendingUserId, username: cleaned, name: cleaned, full_name: cleaned },
        { onConflict: "id" }
      );
      if (userError) console.error("Error upserting users record:", userError);

      onLogin(cleaned, pendingUserId);
    } catch (err: any) {
      setUsernameError(err.message || "Failed to save username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Username status icon ─────────────────────────────────────
  const UsernameIcon = () => {
    if (usernameStatus === "checking") return <Loader2 className="w-4 h-4 animate-spin text-[#8a7c74]" />;
    if (usernameStatus === "available") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (usernameStatus === "taken" || usernameStatus === "invalid") return <XCircle className="w-4 h-4 text-red-500" />;
    return <AtSign className="w-4 h-4 text-[#8a7c74]" />;
  };

  // ── Choose-username screen ───────────────────────────────────
  if (screen === "choose-username") {
    return (
      <div
        className={isModal ? "w-full" : "min-h-screen flex items-center justify-center p-4"}
        style={isModal ? {} : { background: "linear-gradient(135deg, #fef9f5 0%, #fce4da 50%, #f5e8e0 100%)" }}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart className="w-8 h-8 text-[#d4756f]" />
              <h1 className="text-[#2d2424] dark:text-[#f5e8e0] text-3xl transition-colors duration-300">Smile Artist</h1>
            </div>
            <p className="text-[#8a7c74]">One last step — choose your username</p>
          </div>

          <Card className="relative p-6 md:p-8 bg-white/90 backdrop-blur-sm border-2 border-[#d4756f]/20 rounded-3xl shadow-xl">
            {isModal && onClose && (
              <button onClick={onClose} className="absolute top-4 right-4 text-[#8a7c74] hover:text-[#d4756f] transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="mb-6">
              <h2 className="text-[#2d2424] text-xl font-semibold mb-1">Pick your username</h2>
              <p className="text-sm text-[#8a7c74]">
                This is how others will find and mention you. It must be unique and cannot be changed easily.
              </p>
            </div>

            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#2d2424] mb-1.5">Username</label>
                <div className={`flex items-center w-full border rounded-xl bg-white px-3 h-10 transition-all ${
                  usernameStatus === "available" ? "border-green-400 ring-1 ring-green-400/30" :
                  usernameStatus === "taken" || usernameStatus === "invalid" ? "border-red-400 ring-1 ring-red-400/30" :
                  "border-[#d4756f]/20 focus-within:border-[#d4756f] focus-within:ring-1 focus-within:ring-[#d4756f]/30"
                }`}>
                  <span className="text-[#8a7c74] text-sm mr-1">@</span>
                  <input
                    type="text"
                    placeholder="yourname"
                    value={newUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-[#2d2424] placeholder:text-[#8a7c74]/60 min-w-0"
                    autoFocus
                    maxLength={20}
                  />
                  <div className="ml-2 flex-shrink-0">
                    <UsernameIcon />
                  </div>
                </div>
                {usernameStatus === "available" && (
                  <p className="text-xs text-green-600 mt-1">✓ Username is available!</p>
                )}
                {usernameError && (
                  <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                )}
                <p className="text-xs text-[#8a7c74] mt-1">3–20 characters · letters, numbers, underscores</p>
              </div>

              <Button
                type="submit"
                disabled={usernameStatus !== "available" || submitting}
                className="w-full bg-gradient-to-r from-[#d4756f] to-[#c9a28f] hover:from-[#c9675f] hover:to-[#b89280] text-white rounded-xl h-11 shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                ) : (
                  "Confirm Username & Continue"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // ── Auth screen (login / signup) ─────────────────────────────
  return (
    <div
      className={isModal ? "w-full" : "min-h-screen flex items-center justify-center p-4"}
      style={isModal ? {} : { background: "linear-gradient(135deg, #fef9f5 0%, #fce4da 50%, #f5e8e0 100%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-6 h-6 text-[#d4756f]" />
            <h1 className="text-[#2d2424] dark:text-[#f5e8e0] text-2xl transition-colors duration-300">Smile Artist</h1>
          </div>
          <p className="text-[#8a7c74] text-xs">
            A space for poetry, writing, and heartfelt connections
          </p>
        </div>

        <Card className="relative p-5 md:p-6 bg-white/90 backdrop-blur-sm border border-[#d4756f]/20 rounded-2xl shadow-xl">
          {isModal && onClose && (
            <button onClick={onClose} className="absolute top-3 right-3 text-[#8a7c74] hover:text-[#d4756f] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => { setIsSignup(false); setError(""); }}
              className={`flex-1 rounded-xl transition-all ${
                !isSignup
                  ? "bg-gradient-to-r from-[#d4756f] to-[#c9a28f] text-white"
                  : "bg-[#fce4da]/30 text-[#8a7c74] hover:bg-[#fce4da]/50"
              }`}
            >
              Login
            </Button>
            <Button
              onClick={() => { setIsSignup(true); setError(""); }}
              className={`flex-1 rounded-xl transition-all ${
                isSignup
                  ? "bg-gradient-to-r from-[#d4756f] to-[#c9a28f] text-white"
                  : "bg-[#fce4da]/30 text-[#8a7c74] hover:bg-[#fce4da]/50"
              }`}
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#2d2424] mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-[#d4756f]/20 rounded-xl focus:border-[#d4756f]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d2424] mb-1.5">Password</label>
              <div className="flex items-center w-full border border-[#d4756f]/20 rounded-xl bg-white px-3 h-10 focus-within:border-[#d4756f] focus-within:ring-1 focus-within:ring-[#d4756f]/30 transition-all">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-[#2d2424] placeholder:text-[#8a7c74]/60 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="ml-2 flex-shrink-0 text-[#8a7c74] hover:text-[#d4756f] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-sm text-[#2d2424] mb-1.5">Confirm Password</label>
                <div className="flex items-center w-full border border-[#d4756f]/20 rounded-xl bg-white px-3 h-10 focus-within:border-[#d4756f] focus-within:ring-1 focus-within:ring-[#d4756f]/30 transition-all">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-[#2d2424] placeholder:text-[#8a7c74]/60 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="ml-2 flex-shrink-0 text-[#8a7c74] hover:text-[#d4756f] transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-[#d4756f] to-[#c9a28f] hover:from-[#c9675f] hover:to-[#b89280] text-white rounded-xl h-11 shadow-md disabled:opacity-70"
            >
              {authLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isSignup ? "Creating…" : "Logging in…"}</>
              ) : (
                isSignup ? "Create Account" : "Login"
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#d4756f]/10 w-full" />
            <span className="absolute bg-white px-2 text-xs text-[#8a7c74]" style={{ background: "transparent" }}>Or continue with</span>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-2 border border-[#d4756f]/20 hover:border-[#d4756f] hover:bg-[#fce4da]/10 text-[#2d2424] rounded-xl h-11 transition-all disabled:opacity-70"
          >
            <GoogleIcon />
            <span className="text-sm font-medium">Google</span>
          </Button>

          {/* Features */}
          <div className="mt-4 pt-4 border-t border-[#d4756f]/10">
            <p className="text-xs text-[#8a7c74] mb-2 text-center">What you'll get:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#2d2424]">
                <BookOpen className="w-4 h-4 text-[#d4756f]" />
                <span>Share your poetry and writings</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#2d2424]">
                <Heart className="w-4 h-4 text-[#d4756f]" />
                <span>Connect with a support buddy</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#2d2424]">
                <Sparkles className="w-4 h-4 text-[#d4756f]" />
                <span>Customize your experience</span>
              </div>
            </div>
          </div>
        </Card>
 
        {isInstallable && (
          <div className="mt-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Button 
              onClick={showInstallPrompt}
              variant="outline"
              className="bg-white/50 backdrop-blur-sm border-2 border-[#d4756f]/30 hover:border-[#d4756f] hover:bg-[#fce4da]/20 text-[#2d2424] rounded-2xl h-12 px-8 flex items-center gap-2 group transition-all"
            >
              <Download className="w-5 h-5 text-[#d4756f] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">{t("install_app")}</div>
                <div className="text-sm font-medium">{t("install_desc")}</div>
              </div>
            </Button>
          </div>
        )}
 
        <p className="text-center text-xs text-[#8a7c74] mt-4">
          A safe, supportive space for your creative expression
        </p>

        <div className="flex flex-wrap justify-center items-center gap-y-1 mt-3 text-xs text-[#8a7c74]/80 border-t border-[#d4756f]/10 pt-3 pb-3">
          <a href="/?view=about" onClick={(e) => { e.preventDefault(); onClose?.(); onViewChange?.("about"); }} className="hover:text-[#d4756f] hover:underline transition-colors px-1">About Us</a>
          <span className="opacity-40">•</span>
          <a href="/?view=terms" onClick={(e) => { e.preventDefault(); onClose?.(); onViewChange?.("terms"); }} className="hover:text-[#d4756f] hover:underline transition-colors px-1">Terms</a>
          <span className="opacity-40">•</span>
          <a href="/?view=privacy" onClick={(e) => { e.preventDefault(); onClose?.(); onViewChange?.("privacy"); }} className="hover:text-[#d4756f] hover:underline transition-colors px-1">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
