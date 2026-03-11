import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Loader2, AlertCircle, Pencil, MapPin, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SignaturePad from "@/components/SignaturePad";

const STORAGE_KEY = "checkin_user_data";

const formatTime12 = (time: string | null | undefined) => {
  if (!time) return null;
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const EventInfoBanner = ({ date, venue, startTime, endTime }: { date: string | null; venue: string | null; startTime: string | null; endTime: string | null }) => {
  if (!venue && !startTime && !date) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
      {date && (
        <span className="flex items-center gap-1">
          📅 {format(new Date(date + "T00:00:00"), "MMMM d, yyyy")}
        </span>
      )}
      {venue && (
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {venue}
        </span>
      )}
      {startTime && (
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {formatTime12(startTime)}{endTime ? ` – ${formatTime12(endTime)}` : ""}
        </span>
      )}
    </div>
  );
};

interface UserData {
  full_name: string;
  email: string;
  phone_number: string;
  designation_department: string;
}

const CheckIn = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("event");

  const [form, setForm] = useState<UserData>({ full_name: "", email: "", phone_number: "07", designation_department: "" });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [hasStored, setHasStored] = useState(false);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventVenue, setEventVenue] = useState<string | null>(null);
  const [eventStartTime, setEventStartTime] = useState<string | null>(null);
  const [eventEndTime, setEventEndTime] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState(false);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!eventId) { setEventLoading(false); setEventError(true); return; }
    const fetchEvent = async () => {
      const { data, error } = await supabase.from("events").select("title, venue, start_time, end_time, date").eq("id", eventId).single();
      if (error || !data) setEventError(true);
      else {
        setEventTitle(data.title);
        setEventVenue(data.venue);
        setEventStartTime(data.start_time);
        setEventEndTime(data.end_time);
        setEventDate(data.date);
      }
      setEventLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Map legacy fields
        setForm({
          full_name: parsed.full_name || "",
          email: parsed.email || "",
          phone_number: parsed.phone_number || "07",
          designation_department: parsed.designation_department || parsed.job_title || "",
        });
        setHasStored(true);
        if (eventId && parsed.email) {
          checkExisting(parsed.email);
        }
      } catch {}
    }
  }, [eventId]);

  const checkExisting = async (email: string) => {
    if (!eventId) return;
    const { data } = await supabase
      .from("attendance_logs")
      .select("id, full_name, email, phone_number, designation_department")
      .eq("event_id", eventId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (data) {
      setExistingRecordId(data.id);
      setForm({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        designation_department: (data as any).designation_department || "",
      });
      setCheckedIn(true);
    }
  };

  const updateField = (key: keyof UserData, value: string) => {
    if (key === "phone_number" && !value.startsWith("07")) {
      if (value.length < 2) value = "07";
      else return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasStored(false);
  };

  const uploadSignature = async (): Promise<string | null> => {
    if (!signatureDataUrl || !eventId) return null;
    try {
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      const fileName = `${eventId}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
      const { error } = await supabase.storage.from("signatures").upload(fileName, blob, { contentType: "image/png" });
      if (error) { console.error("Signature upload error:", error); return null; }
      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) { console.error("Signature upload error:", err); return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { full_name, email, phone_number, designation_department } = form;
    if (!full_name.trim() || !email.trim() || !phone_number.trim() || !designation_department.trim()) { toast.error("Please fill in all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email"); return; }
    if (!signatureDataUrl && !existingRecordId) { toast.error("Please provide your signature"); return; }

    setLoading(true);
    try {
      let sigUrl: string | null = null;
      if (signatureDataUrl) {
        sigUrl = await uploadSignature();
      }

      const payload: any = {
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone_number.trim(),
        designation_department: designation_department.trim(),
        // Keep legacy fields populated for backward compatibility
        job_title: designation_department.trim(),
        company: designation_department.trim(),
      };
      if (sigUrl) payload.signature_url = sigUrl;

      if (isEditing && existingRecordId) {
        const { error } = await supabase.from("attendance_logs").update(payload).eq("id", existingRecordId);
        if (error) throw error;
        toast.success("Your details have been updated!");
        setIsEditing(false);
      } else {
        const { data: existing } = await supabase
          .from("attendance_logs")
          .select("id")
          .eq("event_id", eventId!)
          .eq("email", payload.email)
          .maybeSingle();

        if (existing) {
          setExistingRecordId(existing.id);
          const { error } = await supabase.from("attendance_logs").update(payload).eq("id", existing.id);
          if (error) throw error;
          toast.success("Your details have been updated!");
        } else {
          const { error } = await supabase.from("attendance_logs").insert({ ...payload, event_id: eventId });
          if (error) throw error;
          toast.success("You're checked in!");
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ full_name: payload.full_name, email: payload.email, phone_number: payload.phone_number, designation_department: payload.designation_department }));
      setCheckedIn(true);
    } catch (err: any) { toast.error("Check-in failed. Please try again."); console.error(err); } finally { setLoading(false); }
  };

  if (eventLoading) return <div className="min-h-screen bg-background"><AppHeader /><div className="flex items-center justify-center p-4 pt-32"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></div>;

  if (eventError) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md text-center glass-card">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
            <AlertCircle className="w-14 h-14 text-destructive" />
            <h2 className="text-xl font-bold">Invalid Event</h2>
            <p className="text-muted-foreground">This check-in link is invalid or the event no longer exists.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (checkedIn && !isEditing) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center p-4 pt-20">
        <Card className="w-full max-w-md text-center glass-card">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-primary" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold">You're Checked In!</h2>
            <p className="text-muted-foreground">Thank you, {form.full_name}. Your attendance for <strong>{eventTitle}</strong> has been recorded.</p>
            <EventInfoBanner date={eventDate} venue={eventVenue} startTime={eventStartTime} endTime={eventEndTime} />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => { setIsEditing(true); }}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex items-center justify-center p-4 pt-10">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <ClipboardCheck className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isEditing ? "Edit Your Details" : `Check-in for ${eventTitle}`}
            </CardTitle>
            <CardDescription>
              {isEditing ? "Update your information below" : hasStored ? "Welcome back! Confirm your details to check in." : "Enter your details to mark your attendance"}
            </CardDescription>
            {!isEditing && <EventInfoBanner date={eventDate} venue={eventVenue} startTime={eventStartTime} endTime={eventEndTime} />}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation_department">Designation / Department</Label>
                <Input id="designation_department" placeholder="e.g. Engineer / ICT Dept" value={form.designation_department} onChange={(e) => updateField("designation_department", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" type="tel" placeholder="0712-345-678" value={form.phone_number} onChange={(e) => updateField("phone_number", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required disabled={isEditing} />
              </div>
              <div className="space-y-1.5">
                <Label>Signature</Label>
                <SignaturePad onSignatureChange={setSignatureDataUrl} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : isEditing ? "Update Details" : hasStored ? "Confirm Attendance" : "Check In"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" className="w-full" onClick={() => { setIsEditing(false); setCheckedIn(true); }}>
                  Cancel
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckIn;
