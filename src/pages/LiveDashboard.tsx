import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, Radio, QrCode, BarChart3 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AppHeader from "@/components/AppHeader";

interface PublicLog {
  id: string;
  full_name: string;
  company: string;
  created_at: string;
}

const LiveDashboard = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<PublicLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"attendance" | "qr">("attendance");

  const checkInUrl = eventId ? `${window.location.origin}/checkin?event=${eventId}` : "";

  useEffect(() => {
    if (!eventId) { setError(true); setLoading(false); return; }
    supabase.from("events").select("title").eq("id", eventId).single().then(({ data, error: err }) => {
      if (err || !data) { setError(true); setLoading(false); return; }
      setEventTitle(data.title);
    });
  }, [eventId]);

  useEffect(() => {
    if (!eventId || error) return;
    const fetchData = async () => {
      const { data } = await supabase.from("attendance_logs_public" as any).select("id, full_name, company, created_at").eq("event_id", eventId).order("created_at", { ascending: false });
      if (data) { setTotalCount(data.length); setRecentCheckins((data as unknown as PublicLog[]).slice(0, 10)); }
      setLoading(false);
    };
    fetchData();

    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchData, 5000);

    // Also try realtime subscription (works when authenticated)
    const channel = supabase.channel(`live-${eventId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs", filter: `event_id=eq.${eventId}` }, (payload) => {
      const n = payload.new as any;
      const rec: PublicLog = { id: n.id, full_name: n.full_name, company: n.company, created_at: n.created_at };
      setTotalCount((p) => p + 1);
      setRecentCheckins((p) => [rec, ...p].slice(0, 10));
    }).subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [eventId, error]);

  if (loading) return <div className="min-h-screen bg-background"><AppHeader /><div className="flex items-center justify-center pt-32"><Loader2 className="w-12 h-12 animate-spin text-muted-foreground" /></div></div>;
  if (error) return <div className="min-h-screen bg-background"><AppHeader /><div className="flex items-center justify-center pt-32"><p className="text-2xl text-muted-foreground">Event not found</p></div></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <header className="py-8 px-6 text-center border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-destructive animate-pulse" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Live</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold">{eventTitle}</h1>

        {/* Toggle */}
        <div className="mt-6 inline-flex items-center rounded-full border border-border bg-muted/50 p-1">
          <button
            onClick={() => setView("attendance")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              view === "attendance"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Attendance
          </button>
          <button
            onClick={() => setView("qr")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              view === "qr"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        {view === "attendance" ? (
          <div className="flex flex-col items-center gap-12 w-full max-w-xl">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-2">
                <Users className="w-10 h-10 text-primary" />
                <span className="text-8xl md:text-[10rem] font-extrabold tabular-nums leading-none">{totalCount}</span>
              </div>
              <p className="text-xl text-muted-foreground">Total Attendees</p>
            </div>

            <div className="w-full">
              <h2 className="text-lg font-semibold mb-4 text-center text-muted-foreground">Recent Check-ins</h2>
              <div className="space-y-2">
                {recentCheckins.length === 0 ? (
                  <p className="text-center text-muted-foreground">Waiting for check-ins…</p>
                ) : recentCheckins.map((r, i) => (
                  <div key={r.id} className={`flex items-center justify-between px-5 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all ${i === 0 ? "ring-2 ring-primary/30" : ""}`}>
                    <span className="font-semibold text-lg">{r.full_name}</span>
                    <span className="text-muted-foreground">{r.company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="p-10 bg-white rounded-3xl shadow-lg border border-border">
              <QRCodeSVG value={checkInUrl} size={320} />
            </div>
            <p className="text-lg font-semibold text-primary">Scan to Check In</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs break-all">{checkInUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveDashboard;
