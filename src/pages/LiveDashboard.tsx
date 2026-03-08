import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, Radio } from "lucide-react";

interface PublicLog {
  id: string;
  full_name: string;
  company: string;
  created_at: string;
}

const LiveDashboard = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [eventTitle, setEventTitle] = useState<string>("");
  const [totalCount, setTotalCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<PublicLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch event info
  useEffect(() => {
    if (!eventId) { setError(true); setLoading(false); return; }
    const fetchEvent = async () => {
      const { data, error: err } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .single();
      if (err || !data) { setError(true); setLoading(false); return; }
      setEventTitle(data.title);
    };
    fetchEvent();
  }, [eventId]);

  // Fetch initial data & subscribe to realtime
  useEffect(() => {
    if (!eventId || error) return;

    const fetchInitial = async () => {
      // Use the public view — only exposes name + company
      const { data, error: err } = await supabase
        .from("attendance_logs_public" as any)
        .select("id, full_name, company, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (!err && data) {
        setTotalCount(data.length);
        setRecentCheckins((data as unknown as PublicLog[]).slice(0, 10));
      }
      setLoading(false);
    };
    fetchInitial();

    // Realtime subscription
    const channel = supabase
      .channel(`live-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_logs",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const publicRecord: PublicLog = {
            id: newRecord.id,
            full_name: newRecord.full_name,
            company: newRecord.company,
            created_at: newRecord.created_at,
          };
          setTotalCount((prev) => prev + 1);
          setRecentCheckins((prev) => [publicRecord, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, error]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-2xl text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-8 px-6 text-center border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-destructive animate-pulse" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Live</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {eventTitle}
        </h1>
      </header>

      {/* Counter */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Users className="w-10 h-10 text-primary" />
            <span className="text-8xl md:text-[10rem] font-bold tabular-nums leading-none" style={{ fontFamily: "var(--font-display)" }}>
              {totalCount}
            </span>
          </div>
          <p className="text-xl text-muted-foreground">Total Attendees</p>
        </div>

        {/* Recent check-ins */}
        <div className="w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-4 text-center text-muted-foreground">Recent Check-ins</h2>
          <div className="space-y-2">
            {recentCheckins.length === 0 ? (
              <p className="text-center text-muted-foreground">Waiting for check-ins…</p>
            ) : (
              recentCheckins.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-5 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all ${i === 0 ? "animate-fade-in ring-2 ring-primary/30" : ""}`}
                >
                  <span className="font-semibold text-lg">{r.full_name}</span>
                  <span className="text-muted-foreground">{r.company}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDashboard;
