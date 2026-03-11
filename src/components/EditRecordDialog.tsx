import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RecordData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  company: string;
  designation_department?: string;
}

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordData | null;
  onSave: (id: string, data: { full_name: string; email: string; phone_number: string; job_title: string; company: string; designation_department: string }) => Promise<void>;
}

const EditRecordDialog = ({ open, onOpenChange, record, onSave }: EditRecordDialogProps) => {
  const [form, setForm] = useState({ full_name: "", email: "", phone_number: "", designation_department: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        full_name: record.full_name,
        email: record.email,
        phone_number: record.phone_number,
        designation_department: record.designation_department || record.job_title || "",
      });
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    await onSave(record.id, {
      full_name: form.full_name,
      email: form.email,
      phone_number: form.phone_number,
      designation_department: form.designation_department,
      // Keep legacy fields in sync
      job_title: form.designation_department,
      company: form.designation_department,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Record</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Email Address</Label>
            <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Phone Number</Label>
            <Input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Designation / Department</Label>
            <Input value={form.designation_department} onChange={(e) => setForm((p) => ({ ...p, designation_department: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecordDialog;
