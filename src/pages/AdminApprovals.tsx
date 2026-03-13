import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { format } from "date-fns";

interface PendingUser {
  id: string;
  full_name: string;
  department: string;
  status: string;
  created_at: string;
  email?: string;
}

const AdminApprovals = () => {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin"); return; }

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!roleData) { navigate("/admin/dashboard"); return; }

    setIsSuperAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch all profiles (super admin has access)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    // Get emails from auth for display - use list_admins RPC for those who have roles
    // For profiles without roles, we show the profile data
    setUsers(data || []);
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to approve user");
    } else {
      toast.success("User approved successfully");
      fetchUsers();
    }
    setActionLoading(null);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to reject user");
    } else {
      toast.success("User rejected");
      fetchUsers();
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-600 text-white">Active</Badge>;
      case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-4xl mx-auto p-4 pt-20 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              User Approvals
            </h1>
            <p className="text-muted-foreground text-sm">Approve or reject user sign-up requests</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage sign-up requests and user access</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                        <TableCell>{user.department || "—"}</TableCell>
                        <TableCell>{statusBadge(user.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {user.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(user.id)}
                                disabled={actionLoading === user.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                                Reject
                              </Button>
                            </>
                          )}
                          {user.status === "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(user.id)}
                              disabled={actionLoading === user.id}
                            >
                              Re-approve
                            </Button>
                          )}
                          {user.status === "active" && (
                            <span className="text-xs text-muted-foreground">Active</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminApprovals;
