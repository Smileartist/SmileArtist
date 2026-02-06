import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "../utils/supabaseClient";
import { Heart, Sparkles, BookOpen } from "lucide-react";

interface LoginProps {
  onLogin: (username: string, userId: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !email || !password) {
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

    try {
      let user = null;
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (signUpError) throw signUpError;
        user = data.user;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        user = data.user;
      }

      if (user) {
        if (isSignup) {
          // Create profile entry for new user
          const { error: profileError } = await supabase.from("profiles").insert([
            {
              id: user.id,
              username: username.toLowerCase(),
              full_name: username,
            },
          ]);
          if (profileError) console.error("Error creating profile:", profileError);
        }
        onLogin(user.user_metadata?.username || username, user.id);
      } else {
        setError("An unexpected error occurred.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #fef9f5 0%, #fce4da 50%, #f5e8e0 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Heart className="w-8 h-8 text-[#d4756f]" />
            <h1 className="text-[#2d2424] text-3xl">Smile Artist</h1>
          </div>
          <p className="text-[#8a7c74]">
            A space for poetry, writing, and heartfelt connections
          </p>
        </div>

        {/* Login/Signup Card */}
        <Card className="p-6 md:p-8 bg-white/90 backdrop-blur-sm border-2 border-[#d4756f]/20 rounded-3xl shadow-xl">
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => {
                setIsSignup(false);
                setError("");
              }}
              className={`flex-1 rounded-xl transition-all ${
                !isSignup
                  ? "bg-gradient-to-r from-[#d4756f] to-[#c9a28f] text-white"
                  : "bg-[#fce4da]/30 text-[#8a7c74] hover:bg-[#fce4da]/50"
              }`}
            >
              Login
            </Button>
            <Button
              onClick={() => {
                setIsSignup(true);
                setError("");
              }}
              className={`flex-1 rounded-xl transition-all ${
                isSignup
                  ? "bg-gradient-to-r from-[#d4756f] to-[#c9a28f] text-white"
                  : "bg-[#fce4da]/30 text-[#8a7c74] hover:bg-[#fce4da]/50"
              }`}
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#2d2424] mb-1.5">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-[#d4756f]/20 rounded-xl focus:border-[#d4756f]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d2424] mb-1.5">
                Email
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-[#d4756f]/20 rounded-xl focus:border-[#d4756f]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d2424] mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-[#d4756f]/20 rounded-xl focus:border-[#d4756f]"
              />
            </div>

            {isSignup && (
              <div>
                <label className="block text-sm text-[#2d2424] mb-1.5">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border-[#d4756f]/20 rounded-xl focus:border-[#d4756f]"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#d4756f] to-[#c9a28f] hover:from-[#c9675f] hover:to-[#b89280] text-white rounded-xl h-11 shadow-md"
            >
              {isSignup ? "Create Account" : "Login"}
            </Button>
          </form>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-[#d4756f]/10">
            <p className="text-xs text-[#8a7c74] mb-3 text-center">
              What you'll get:
            </p>
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

        <p className="text-center text-xs text-[#8a7c74] mt-4">
          A safe, supportive space for your creative expression
        </p>
      </div>
    </div>
  );
}
