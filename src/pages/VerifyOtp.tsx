import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Mail } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const VerifyOtp = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email;

  useEffect(() => {
    if (!email) {
      navigate("/admin");
      return;
    }
    sendOtp();
  }, []);

  const sendOtp = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSent(true);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      toast.success("Verified successfully!");
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription className="text-base">
              {sent ? (
                <>A 6-digit code has been sent to <span className="font-semibold text-foreground">{email}</span></>
              ) : (
                "Sending verification code..."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
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
              onClick={handleVerify}
              className="w-full"
              size="lg"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
              ) : "Verify & Continue"}
            </Button>

            <button
              type="button"
              onClick={sendOtp}
              disabled={sending}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend Code"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOtp;
