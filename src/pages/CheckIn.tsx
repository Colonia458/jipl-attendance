import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, UserCheck, Loader2 } from "lucide-react";

const CheckIn = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = navigator.userAgent;
      const { error } = await supabase.from("attendance").insert({
        attendee_name: name.trim(),
        email: email.trim().toLowerCase(),
        device_info: deviceInfo,
      });

      if (error) throw error;

      setCheckedIn(true);
      toast.success("Successfully checked in!");
    } catch (err: any) {
      toast.error("Check-in failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (checkedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass-card text-center">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">You're Checked In!</h2>
            <p className="text-muted-foreground">Thank you, {name}. Your attendance has been recorded.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setCheckedIn(false);
                setName("");
                setEmail("");
              }}
            >
              Check in another person
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <UserCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Attendance Check-In
          </CardTitle>
          <CardDescription>Enter your details to mark your attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking in...
                </>
              ) : (
                "Check In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckIn;
