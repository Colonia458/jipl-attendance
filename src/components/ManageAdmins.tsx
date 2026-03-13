import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, ShieldCheck, Settings, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  user_id: string;
  email: string;
  role: "super_admin" | "admin";
  created_at: string;
  status: string;
}

const ALL_PERMISSIONS = [
  { key: "export_data", label: "Export XLSX & PDF Reports" },
  { key: "create_events", label: "Create & Edit Events" },
  { key: "manage_attendance", label: "Manage Attendance Logs" },
];

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<AdminUser[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [newPermissions, setNewPermissions] = useState<string[]>(ALL_PERMISSIONS.map(p => p.key));
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [permDialogAdmin, setPermDialogAdmin] = useState<AdminUser | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    fetchAdmins();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_admins");
    if (error) {
      toast.error("Failed to load admins");
      console.error(error);
    } else {
      const allAdmins = (data as AdminUser[]) || [];
      const pending = allAdmins.filter(a => a.status === "pending");
      const active = allAdmins.filter(a => a.status !== "pending");
      setPendingAdmins(pending);
      setAdmins(active);
      // Fetch permissions for active regular admins
      const allUserIds = active.filter(a => a.role === "admin").map(a => a.user_id);
      if (allUserIds.length > 0) {
        const { data: perms } = await supabase
          .from("admin_permissions" as any)
          .select("user_id, permission")
          .in("user_id", allUserIds);
        const permMap: Record<string, string[]> = {};
        (perms as any[] || []).forEach((p: any) => {
          if (!permMap[p.user_id]) permMap[p.user_id] = [];
          permMap[p.user_id].push(p.permission);
        });
        setAdminPermissions(permMap);
      }
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!email || !password) { toast.error("Email and password are required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-admin", {
        body: { action: "create", email, password, role, permissions: role === "admin" ? newPermissions : [] },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success(`Admin ${email} created — pending approval`);
      setEmail("");
      setPassword("");
      setRole("admin");
      setNewPermissions(ALL_PERMISSIONS.map(p => p.key));
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to create admin");
    }
    setCreating(false);
  };

  const handleApprove = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-admin", {
        body: { action: "approve", user_id: userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Admin approved — they can now log in");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve admin");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-admin", {
        body: { action: "delete", user_id: userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Admin request rejected");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject admin");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-admin", {
        body: { action: "delete", user_id: userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Admin removed");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove admin");
    }
  };

  const handleSavePermissions = async () => {
    if (!permDialogAdmin) return;
    setSavingPerms(true);
    try {
      await supabase.from("admin_permissions" as any).delete().eq("user_id", permDialogAdmin.user_id);
      if (editPerms.length > 0) {
        const rows = editPerms.map(p => ({ user_id: permDialogAdmin.user_id, permission: p }));
        const { error } = await supabase.from("admin_permissions" as any).insert(rows);
        if (error) throw error;
      }
      toast.success("Permissions updated");
      setPermDialogAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error("Failed to update permissions");
    }
    setSavingPerms(false);
  };

  const togglePermission = (list: string[], key: string) => {
    return list.includes(key) ? list.filter(p => p !== key) : [...list, key];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Admin Users</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Admin</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add New Admin</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "super_admin")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "admin" && (
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  {ALL_PERMISSIONS.map(p => (
                    <div key={p.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`new-${p.key}`}
                        checked={newPermissions.includes(p.key)}
                        onCheckedChange={() => setNewPermissions(prev => togglePermission(prev, p.key))}
                      />
                      <label htmlFor={`new-${p.key}`} className="text-sm">{p.label}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests */}
      {pendingAdmins.length > 0 && (
        <Card className="glass-card border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-amber-800 dark:text-amber-400 text-sm">
              Pending Requests ({pendingAdmins.length})
            </span>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAdmins.map((a) => (
                  <TableRow key={a.user_id} className="bg-amber-50/30 dark:bg-amber-950/10">
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                        {a.role === "super_admin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => handleApprove(a.user_id)}
                          data-testid={`button-approve-${a.user_id}`}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive"
                              data-testid={`button-reject-${a.user_id}`}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject this request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {a.email}'s account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(a.user_id)}>Reject</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Admins */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mb-3 opacity-40" />
              <p>No admins found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell className="font-medium">
                      {a.email}
                      {a.user_id === currentUserId && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.role === "super_admin" ? "default" : "secondary"} className="gap-1">
                        {a.role === "super_admin" ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {a.role === "super_admin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.role === "super_admin" ? (
                        <span className="text-xs text-muted-foreground">Full access</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(adminPermissions[a.user_id] || []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">No permissions</span>
                          ) : (
                            (adminPermissions[a.user_id] || []).map(p => {
                              const perm = ALL_PERMISSIONS.find(ap => ap.key === p);
                              return perm ? <Badge key={p} variant="outline" className="text-xs">{perm.label}</Badge> : null;
                            })
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {a.role === "admin" && a.user_id !== currentUserId && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Permissions" onClick={() => { setPermDialogAdmin(a); setEditPerms(adminPermissions[a.user_id] || []); }}>
                            <Settings className="w-3 h-3" />
                          </Button>
                        )}
                        {a.user_id !== currentUserId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove admin?</AlertDialogTitle>
                                <AlertDialogDescription>This will remove {a.email} and delete their account.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(a.user_id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!permDialogAdmin} onOpenChange={(v) => { if (!v) setPermDialogAdmin(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Permissions — {permDialogAdmin?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {ALL_PERMISSIONS.map(p => (
              <div key={p.key} className="flex items-center gap-2">
                <Checkbox
                  id={`edit-${p.key}`}
                  checked={editPerms.includes(p.key)}
                  onCheckedChange={() => setEditPerms(prev => togglePermission(prev, p.key))}
                />
                <label htmlFor={`edit-${p.key}`} className="text-sm">{p.label}</label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogAdmin(null)}>Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={savingPerms}>
              {savingPerms ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAdmins;
