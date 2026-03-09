import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Loader2, Calendar as CalendarIcon, Eye, QrCode, Radio, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  date: string;
  created_at: string;
}

interface EventsListViewProps {
  events: EventRecord[];
  loading: boolean;
  onSelect: (event: EventRecord) => void;
  onRefresh: () => void;
  onEdit: (event: EventRecord) => void;
  onDelete: (event: EventRecord) => void;
  onQr: (event: EventRecord) => void;
  liveUrl: (eventId: string) => string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newDesc: string;
  setNewDesc: (v: string) => void;
  newDate: string;
  setNewDate: (v: string) => void;
  creating: boolean;
  handleCreateEvent: () => void;
}

const EventsListView = ({
  events, loading, onSelect, onRefresh, onEdit, onDelete, onQr, liveUrl,
  newTitle, setNewTitle, newDesc, setNewDesc, newDate, setNewDate, creating, handleCreateEvent,
}: EventsListViewProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">All Events</h2>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onRefresh}>Refresh</Button>
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
          <Card key={ev.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onSelect(ev)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ev.title}</CardTitle>
              <CardDescription>{format(new Date(ev.date), "MMMM d, yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSelect(ev); }}>
                <Eye className="w-4 h-4 mr-1" /> Logs
              </Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="Edit Event" onClick={(e) => { e.stopPropagation(); onEdit(ev); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="QR Actions" onClick={(e) => { e.stopPropagation(); onQr(ev); }}>
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Live Dashboard" onClick={(e) => { e.stopPropagation(); window.open(liveUrl(ev.id), "_blank"); }}>
                  <Radio className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete Event" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(ev); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
);

export default EventsListView;
