import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Shield, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"login" | "otp">("login");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check account status (pending approval)
      const { data: userStatus } = await supabase.rpc("get_my_status");
      if (userStatus === "pending") {
        await supabase.auth.signOut();
        throw new Error("Your account is pending approval from a super admin.");
      }

      // Super admins bypass 2FA and go straight to the dashboard
      const { data: isSuperAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "super_admin",
      });

      if (isSuperAdmin) {
        await supabase.from("admin_login_logs").insert({
          user_id: data.user.id,
          email: data.user.email || email,
          user_agent: navigator.userAgent,
        });
        navigate("/admin/dashboard");
      } else {
        // Sign out the password session, then send a one-time email code
        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        toast.success("A 6-digit verification code has been sent to your email.");
        setStep("otp");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("admin_login_logs").insert({
          user_id: data.user.id,
          email: data.user.email || email,
          user_agent: navigator.userAgent,
        });
      }
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md glass-card">
          {step === "login" ? (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
                <CardDescription>Sign in to access the attendance dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type={showEmail ? "text" : "email"}
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pr-10"
                        data-testid="input-email"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmail(!showEmail)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading} data-testid="button-signin">
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
                <CardDescription>
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center" data-testid="input-otp">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={otpLoading}
                    data-testid="button-verify"
                  >
                    {otpLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => { setStep("login"); setOtp(""); }}
                    data-testid="button-back-to-login"
                  >
                    ← Back to Login
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
