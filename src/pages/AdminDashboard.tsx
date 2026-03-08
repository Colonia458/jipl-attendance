import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Trash2, LogOut, QrCode, Users, Loader2, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format, isToday } from "date-fns";

interface LogRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  company: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [records, setRecords] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const checkInUrl = `${window.location.origin}/`;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin"); return; }
      fetchRecords();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/admin");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to fetch records"); console.error(error); }
    else setRecords(data || []);
    setLoading(false);
  };

  const todayCount = useMemo(() => records.filter((r) => isToday(new Date(r.created_at))).length, [records]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) ||
      r.job_title.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleDownloadCSV = () => {
    if (filtered.length === 0) { toast.error("No records to export"); return; }
    const headers = ["Full Name", "Email", "Phone", "Job Title", "Company", "Checked In"];
    const rows = [
      headers.join(","),
      ...filtered.map((r) =>
        [`"${r.full_name}"`, `"${r.email}"`, `"${r.phone_number}"`, `"${r.job_title}"`, `"${r.company}"`, `"${format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}"`].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const handleClearAll = async () => {
    setClearing(true);
    const { error } = await supabase.from("attendance_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Failed to clear records"); console.error(error); }
    else { setRecords([]); toast.success("All records cleared"); }
    setClearing(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Attendance Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{todayCount}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{records.length}</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Attendance Logs</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            {/* Actions */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, company..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleDownloadCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" /> Clear All</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all records?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all {records.length} records.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} disabled={clearing}>{clearing ? "Clearing..." : "Yes, clear all"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="secondary" size="sm" onClick={fetchRecords} className="ml-auto">Refresh</Button>
            </div>

            {/* Table */}
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Users className="w-10 h-10 mb-3 opacity-40" />
                    <p>{search ? "No matching records" : "No attendance records yet"}</p>
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
                <div className="p-6 bg-white rounded-xl border"><QRCodeSVG value={checkInUrl} size={220} /></div>
                <p className="text-sm text-muted-foreground text-center break-all">{checkInUrl}</p>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(checkInUrl); toast.success("URL copied!"); }}>Copy URL</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
