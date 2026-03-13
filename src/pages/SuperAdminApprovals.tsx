import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";

interface UserProfile {
  id: string;
  full_name: string;
  department: string;
  status: string;
  created_at: string;
  email?: string;
}

const SuperAdminApprovals = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
    fetchUsers();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" as any });
    if (!data) { navigate("/admin/dashboard"); toast.error("Access denied"); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load users"); setLoading(false); return; }

    // Get emails via list_admins or just show profiles
    setUsers(data || []);
    setLoading(false);
  };

  const updateStatus = async (userId: string, newStatus: string) => {
    setUpdating(userId);
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`User ${newStatus === "active" ? "approved" : "rejected"}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    }
    setUpdating(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" /> User Approvals
            </h2>
            <p className="text-muted-foreground">Manage user access and approval status</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Toggle user status between pending, active, and rejected</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                      <TableCell>{user.department || "—"}</TableCell>
                      <TableCell>{statusBadge(user.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {user.status !== "active" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(user.id, "active")}
                            disabled={updating === user.id}
                            className="gap-1"
                          >
                            {updating === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Approve
                          </Button>
                        )}
                        {user.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus(user.id, "rejected")}
                            disabled={updating === user.id}
                            className="gap-1"
                          >
                            {updating === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminApprovals;
