import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Download, Trash2, LogOut, QrCode, Users, Loader2, Search, Plus, Calendar as CalendarIcon, Eye, FileText, Radio, X, Pencil } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format, isToday, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import "jspdf-autotable";
import QRActionsModal from "@/components/QRActionsModal";
import DeleteEventDialog from "@/components/DeleteEventDialog";
import EditEventDialog from "@/components/EditEventDialog";
import EditRecordDialog from "@/components/EditRecordDialog";
import AppHeader from "@/components/AppHeader";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  date: string;
  created_at: string;
}

interface LogRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  company: string;
  created_at: string;
  event_id: string | null;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [records, setRecords] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [creating, setCreating] = useState(false);

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const [qrModalEvent, setQrModalEvent] = useState<EventRecord | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<EventRecord | null>(null);
  const [editEvent, setEditEvent] = useState<EventRecord | null>(null);
  const [editRecord, setEditRecord] = useState<LogRecord | null>(null);

  const checkInUrl = (eventId: string) => `${window.location.origin}/checkin?event=${eventId}`;
  const liveUrl = (eventId: string) => `${window.location.origin}/event/${eventId}/live`;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin"); return; }
      fetchEvents();
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/admin");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("events").select("*").order("date", { ascending: false });
    if (error) { toast.error("Failed to fetch events"); console.error(error); }
    else setEvents(data || []);
    setLoading(false);
  };

  const fetchLogs = async (eventId: string) => {
    setLogsLoading(true);
    const { data, error } = await supabase.from("attendance_logs").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
    if (error) { toast.error("Failed to fetch logs"); console.error(error); }
    else setRecords(data || []);
    setLogsLoading(false);
  };

  const handleSelectEvent = (event: EventRecord) => {
    setSelectedEvent(event);
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
    fetchLogs(event.id);
  };

  const handleCreateEvent = async () => {
    if (!newTitle.trim() || !newDate) { toast.error("Title and date are required"); return; }
    setCreating(true);
    const { error } = await supabase.from("events").insert({ title: newTitle.trim(), description: newDesc.trim() || null, date: newDate });
    if (error) { toast.error("Failed to create event"); console.error(error); }
    else { toast.success("Event created!"); setNewTitle(""); setNewDesc(""); setNewDate(format(new Date(), "yyyy-MM-dd")); fetchEvents(); }
    setCreating(false);
  };

  const handleDeleteEvent = useCallback(async () => {
    if (!deleteEvent) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEvent.id);
    if (error) { toast.error("Failed to delete event"); console.error(error); }
    else { toast.success("Event deleted"); if (selectedEvent?.id === deleteEvent.id) { setSelectedEvent(null); setRecords([]); } fetchEvents(); }
  }, [deleteEvent, selectedEvent]);

  const handleUpdateEvent = async (id: string, data: { title: string; description: string | null; date: string }) => {
    const { error } = await supabase.from("events").update(data).eq("id", id);
    if (error) { toast.error("Failed to update event"); console.error(error); }
    else {
      toast.success("Event updated");
      fetchEvents();
      if (selectedEvent?.id === id) setSelectedEvent({ ...selectedEvent, ...data });
    }
  };

  const handleUpdateRecord = async (id: string, data: { full_name: string; email: string; phone_number: string; job_title: string; company: string }) => {
    const { error } = await supabase.from("attendance_logs").update(data).eq("id", id);
    if (error) { toast.error("Failed to update record"); console.error(error); }
    else { toast.success("Record updated"); if (selectedEvent) fetchLogs(selectedEvent.id); }
  };

  const handleDeleteRecord = async (id: string) => {
    const { error } = await supabase.from("attendance_logs").delete().eq("id", id);
    if (error) { toast.error("Failed to delete record"); console.error(error); }
    else { toast.success("Record deleted"); if (selectedEvent) fetchLogs(selectedEvent.id); }
  };

  const filtered = useMemo(() => {
    let result = records;
    if (dateFrom || dateTo) {
      result = result.filter((r) => {
        const d = new Date(r.created_at);
        if (dateFrom && dateTo) return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
        if (dateFrom) return d >= startOfDay(dateFrom);
        if (dateTo) return d <= endOfDay(dateTo);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.job_title.toLowerCase().includes(q));
    }
    return result;
  }, [records, search, dateFrom, dateTo]);

  const todayCount = useMemo(() => records.filter((r) => isToday(new Date(r.created_at))).length, [records]);

  const handleDownloadCSV = () => {
    if (!selectedEvent || filtered.length === 0) { toast.error("No records to export"); return; }
    const headers = ["Timestamp", "Event Name", "Full Name", "Email", "Phone", "Job Title", "Company"];
    const rows = [headers.join(","), ...filtered.map((r) => [`"${format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}"`, `"${selectedEvent.title}"`, `"${r.full_name}"`, `"${r.email}"`, `"${r.phone_number}"`, `"${r.job_title}"`, `"${r.company}"`].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${selectedEvent.title.replace(/\s+/g, "_")}_${selectedEvent.date}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const handlePrintPDF = () => {
    if (!selectedEvent || filtered.length === 0) { toast.error("No records to export"); return; }
    const pdf = new jsPDF("landscape", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();

    // JKUAT branding header
    pdf.setFontSize(10);
    pdf.setTextColor(154, 196, 75);
    pdf.text("JKUAT Industrial Park", 14, 12);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text("Meeting Attendance System", 14, 17);

    // Line separator
    pdf.setDrawColor(154, 196, 75);
    pdf.setLineWidth(0.5);
    pdf.line(14, 20, pageWidth - 14, 20);

    pdf.setTextColor(35, 31, 31);
    pdf.setFontSize(18);
    pdf.text(selectedEvent.title, 14, 30);
    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(`Date: ${format(new Date(selectedEvent.date), "MMMM d, yyyy")}  |  Total: ${filtered.length} attendees`, 14, 38);

    pdf.autoTable({
      startY: 44,
      head: [["#", "Full Name", "Email", "Phone", "Job Title", "Company", "Checked In"]],
      body: filtered.map((r, i) => [i + 1, r.full_name, r.email, r.phone_number, r.job_title, r.company, format(new Date(r.created_at), "MMM d, h:mm a")]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [154, 196, 75], textColor: [35, 31, 31] },
    });

    pdf.save(`${selectedEvent.title.replace(/\s+/g, "_")}_Report.pdf`);
    toast.success("PDF report downloaded");
  };

  const handleClearEventLogs = async () => {
    if (!selectedEvent) return;
    setClearing(true);
    const { error } = await supabase.from("attendance_logs").delete().eq("event_id", selectedEvent.id);
    if (error) { toast.error("Failed to clear records"); console.error(error); }
    else { setRecords([]); toast.success("Records cleared for this event"); }
    setClearing(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Event Dashboard</h2>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!selectedEvent ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">All Events</h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={fetchEvents}>Refresh</Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Event</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5"><Label>Title</Label><Input placeholder="Team Standup" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Description (optional)</Label><Input placeholder="Weekly sync meeting" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <DialogClose asChild><Button onClick={handleCreateEvent} disabled={creating}>{creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create</Button></DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : events.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <CalendarIcon className="w-10 h-10 mb-3 opacity-40" />
                  <p>No events yet. Create your first event to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => (
                  <Card key={ev.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleSelectEvent(ev)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{ev.title}</CardTitle>
                      <CardDescription>{format(new Date(ev.date), "MMMM d, yyyy")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSelectEvent(ev); }}>
                        <Eye className="w-4 h-4 mr-1" /> Logs
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Edit Event" onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="QR Actions" onClick={(e) => { e.stopPropagation(); setQrModalEvent(ev); }}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Live Dashboard" onClick={(e) => { e.stopPropagation(); window.open(liveUrl(ev.id), "_blank"); }}>
                          <Radio className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete Event" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteEvent(ev); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedEvent(null); setRecords([]); }}>← Back</Button>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{selectedEvent.title}</h2>
                <p className="text-sm text-muted-foreground">{format(new Date(selectedEvent.date), "MMMM d, yyyy")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditEvent(selectedEvent)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{todayCount}</p></CardContent></Card>
              <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{records.length}</p></CardContent></Card>
              <Card className="glass-card hidden md:block"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Filtered</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{filtered.length}</p></CardContent></Card>
            </div>

            <Tabs defaultValue="logs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="logs">Attendance Logs</TabsTrigger>
                <TabsTrigger value="qr">QR Code</TabsTrigger>
              </TabsList>

              <TabsContent value="logs" className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search by name, email, company..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline" size="sm" className={cn(!dateFrom && "text-muted-foreground")}><CalendarIcon className="w-4 h-4 mr-2" />{dateFrom ? format(dateFrom, "MMM d") : "From"}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline" size="sm" className={cn(!dateTo && "text-muted-foreground")}><CalendarIcon className="w-4 h-4 mr-2" />{dateTo ? format(dateTo, "MMM d") : "To"}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                  {(dateFrom || dateTo) && <Button variant="ghost" size="icon" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}><X className="w-4 h-4" /></Button>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
                  <Button variant="outline" size="sm" onClick={handlePrintPDF}><FileText className="w-4 h-4 mr-2" /> PDF Report</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" /> Clear All</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Clear all records for this event?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all {records.length} records for "{selectedEvent.title}".</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearEventLogs} disabled={clearing}>{clearing ? "Clearing..." : "Yes, clear all"}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="secondary" size="sm" onClick={() => fetchLogs(selectedEvent.id)} className="ml-auto">Refresh</Button>
                </div>

                <Card className="glass-card overflow-hidden">
                  <CardContent className="p-0">
                    {logsLoading ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Users className="w-10 h-10 mb-3 opacity-40" />
                        <p>{search || dateFrom || dateTo ? "No matching records" : "No attendance records yet"}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="hidden md:table-cell">Phone</TableHead>
                              <TableHead className="hidden lg:table-cell">Job Title</TableHead>
                              <TableHead className="hidden lg:table-cell">Company</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.full_name}</TableCell>
                                <TableCell>{r.email}</TableCell>
                                <TableCell className="hidden md:table-cell">{r.phone_number}</TableCell>
                                <TableCell className="hidden lg:table-cell">{r.job_title}</TableCell>
                                <TableCell className="hidden lg:table-cell">{r.company}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm">{format(new Date(r.created_at), "MMM d, h:mm a")}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRecord(r)}><Pencil className="w-3 h-3" /></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete this record?</AlertDialogTitle><AlertDialogDescription>Remove {r.full_name}'s attendance record permanently.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRecord(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qr">
                <Card className="glass-card">
                  <CardHeader><CardTitle>Check-in QR Code</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="p-6 bg-white rounded-xl border"><QRCodeSVG value={checkInUrl(selectedEvent.id)} size={220} /></div>
                    <p className="text-sm text-muted-foreground text-center break-all">{checkInUrl(selectedEvent.id)}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(checkInUrl(selectedEvent.id)); toast.success("URL copied!"); }}>Copy URL</Button>
                      <Button variant="outline" size="sm" onClick={() => setQrModalEvent(selectedEvent)}>Download QR</Button>
                    </div>
                    <div className="pt-4 border-t border-border w-full text-center">
                      <p className="text-sm text-muted-foreground mb-2">Live Dashboard</p>
                      <Button variant="secondary" size="sm" onClick={() => window.open(liveUrl(selectedEvent.id), "_blank")}><Radio className="w-4 h-4 mr-2" /> Open Live View</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <QRActionsModal open={!!qrModalEvent} onOpenChange={(v) => { if (!v) setQrModalEvent(null); }} url={qrModalEvent ? checkInUrl(qrModalEvent.id) : ""} eventTitle={qrModalEvent?.title || ""} />
      <DeleteEventDialog open={!!deleteEvent} onOpenChange={(v) => { if (!v) setDeleteEvent(null); }} eventTitle={deleteEvent?.title || ""} onConfirm={handleDeleteEvent} />
      <EditEventDialog open={!!editEvent} onOpenChange={(v) => { if (!v) setEditEvent(null); }} event={editEvent} onSave={handleUpdateEvent} />
      <EditRecordDialog open={!!editRecord} onOpenChange={(v) => { if (!v) setEditRecord(null); }} record={editRecord} onSave={handleUpdateRecord} />
    </div>
  );
};

export default AdminDashboard;
