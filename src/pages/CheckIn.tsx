import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";

const STORAGE_KEY = "checkin_user_data";

interface UserData {
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  company: string;
}

const CheckIn = () => {
  const [form, setForm] = useState<UserData>({
    full_name: "",
    email: "",
    phone_number: "",
    job_title: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as UserData;
        setForm(data);
        setHasStored(true);
      } catch {}
    }
  }, []);

  const updateField = (key: keyof UserData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasStored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { full_name, email, phone_number, job_title, company } = form;

    if (!full_name.trim() || !email.trim() || !phone_number.trim() || !job_title.trim() || !company.trim()) {
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
      const payload = {
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone_number.trim(),
        job_title: job_title.trim(),
        company: company.trim(),
      };

      const { error } = await supabase.from("attendance_logs").insert(payload);
      if (error) throw error;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setCheckedIn(true);
      toast.success("You're checked in!");
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
        <Card className="w-full max-w-md text-center glass-card animate-scale-in">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-fade-in">
              <CheckCircle2 className="w-14 h-14 text-success" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold">You're Checked In!</h2>
            <p className="text-muted-foreground">
              Thank you, {form.full_name}. Your attendance has been recorded.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCheckedIn(false)}
            >
              Done
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
            <ClipboardCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Event Check-in</CardTitle>
          <CardDescription>
            {hasStored
              ? "Welcome back! Confirm your details to check in."
              : "Enter your details to mark your attendance"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="Jane Doe" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" type="tel" placeholder="+1 555 123 4567" value={form.phone_number} onChange={(e) => updateField("phone_number", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="job_title">Job Title</Label>
                <Input id="job_title" placeholder="Engineer" value={form.job_title} onChange={(e) => updateField("job_title", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Acme Inc." value={form.company} onChange={(e) => updateField("company", e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking in...
                </>
              ) : hasStored ? (
                "Confirm Attendance"
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
