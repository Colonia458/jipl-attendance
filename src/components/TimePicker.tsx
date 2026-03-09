import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  placeholder?: string;
}

const TimePicker = ({ value, onChange, placeholder = "Select time" }: TimePickerProps) => {
  const parseTime = (val: string) => {
    if (!val) return { hour: "", minute: "", period: "AM" };
    const [h, m] = val.split(":");
    const hNum = parseInt(h);
    return {
      hour: String(hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum),
      minute: m,
      period: hNum >= 12 ? "PM" : "AM",
    };
  };

  const { hour, minute, period } = parseTime(value);

  const to24h = (h: string, m: string, p: string) => {
    let hNum = parseInt(h);
    if (p === "AM" && hNum === 12) hNum = 0;
    if (p === "PM" && hNum !== 12) hNum += 12;
    return `${String(hNum).padStart(2, "0")}:${m}`;
  };

  const handleChange = (part: "hour" | "minute" | "period", val: string) => {
    const h = part === "hour" ? val : hour || "12";
    const m = part === "minute" ? val : minute || "00";
    const p = part === "period" ? val : period;
    onChange(to24h(h, m, p));
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Select value={hour} onValueChange={(v) => handleChange("hour", v)}>
        <SelectTrigger className="w-[52px] h-8 text-xs px-2">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-bold text-xs">:</span>
      <Select value={minute} onValueChange={(v) => handleChange("minute", v)}>
        <SelectTrigger className="w-[52px] h-8 text-xs px-2">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => handleChange("period", v)}>
        <SelectTrigger className="w-[58px] h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker;
