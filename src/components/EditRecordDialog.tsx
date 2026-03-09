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
}

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordData | null;
  onSave: (id: string, data: Omit<RecordData, "id">) => Promise<void>;
}

const EditRecordDialog = ({ open, onOpenChange, record, onSave }: EditRecordDialogProps) => {
  const [form, setForm] = useState({ full_name: "", email: "", phone_number: "", job_title: "", company: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        full_name: record.full_name,
        email: record.email,
        phone_number: record.phone_number,
        job_title: record.job_title,
        company: record.company,
      });
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    await onSave(record.id, form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Record</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {(["full_name", "email", "phone_number", "job_title", "company"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
              <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
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
