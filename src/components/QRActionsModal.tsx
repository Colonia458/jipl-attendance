import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Download, FileText } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { format } from "date-fns";

interface QRActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  eventTitle: string;
  venue?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  eventDate?: string | null;
}

const QRActionsModal = ({ open, onOpenChange, url, eventTitle, venue, startTime, endTime, eventDate }: QRActionsModalProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleCopy = () => { navigator.clipboard.writeText(url); toast.success("URL copied!"); };

  const handleDownloadPNG = async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await toPng(qrRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `${eventTitle.replace(/\s+/g, "_")}_QR.png`;
      link.href = dataUrl;
      link.click();
      toast.success("PNG downloaded");
    } catch { toast.error("Failed to generate PNG"); }
  };

  const handleDownloadPDF = async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await toPng(qrRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 });
      const pdf = new jsPDF("portrait", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      // JKUAT branding header
      pdf.setFontSize(16);
      pdf.setTextColor(35, 31, 31);
      pdf.text("JKUAT Industrial Park Limited", pageWidth / 2, 22, { align: "center" });

      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text("Meeting Attendance System", pageWidth / 2, 29, { align: "center" });

      // Separator
      pdf.setDrawColor(154, 196, 75);
      pdf.setLineWidth(0.5);
      pdf.line(30, 34, pageWidth - 30, 34);

      // Meeting metadata - large and legible
      let yOffset = 50;

      pdf.setFontSize(14);
      pdf.setTextColor(80);
      pdf.text("Meeting Title:", pageWidth / 2, yOffset, { align: "center" });
      yOffset += 9;
      pdf.setFontSize(22);
      pdf.setTextColor(35, 31, 31);
      pdf.text(eventTitle, pageWidth / 2, yOffset, { align: "center" });
      yOffset += 12;

      if (venue) {
        pdf.setFontSize(14);
        pdf.setTextColor(80);
        pdf.text("Venue:", pageWidth / 2, yOffset, { align: "center" });
        yOffset += 8;
        pdf.setFontSize(18);
        pdf.setTextColor(35, 31, 31);
        pdf.text(venue, pageWidth / 2, yOffset, { align: "center" });
        yOffset += 12;
      }

      if (eventDate) {
        pdf.setFontSize(14);
        pdf.setTextColor(80);
        pdf.text("Date:", pageWidth / 2, yOffset, { align: "center" });
        yOffset += 8;
        pdf.setFontSize(18);
        pdf.setTextColor(35, 31, 31);
        pdf.text(format(new Date(eventDate + "T00:00:00"), "MMMM d, yyyy"), pageWidth / 2, yOffset, { align: "center" });
        yOffset += 12;
      }

      if (startTime || endTime) {
        pdf.setFontSize(14);
        pdf.setTextColor(80);
        pdf.text("Time:", pageWidth / 2, yOffset, { align: "center" });
        yOffset += 8;
        pdf.setFontSize(18);
        pdf.setTextColor(35, 31, 31);
        const timeText = startTime && endTime
          ? `${formatTime(startTime)} - ${formatTime(endTime)}`
          : startTime
          ? `${formatTime(startTime)}`
          : `Until ${formatTime(endTime)}`;
        pdf.text(timeText, pageWidth / 2, yOffset, { align: "center" });
        yOffset += 12;
      }

      // Separator
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.line(40, yOffset, pageWidth - 40, yOffset);
      yOffset += 8;

      // "Scan to Check In" label
      pdf.setFontSize(16);
      pdf.setTextColor(154, 196, 75);
      pdf.text("Scan to Check In", pageWidth / 2, yOffset, { align: "center" });
      yOffset += 8;

      // QR code
      const qrSize = 90;
      const x = (pageWidth - qrSize) / 2;
      pdf.addImage(dataUrl, "PNG", x, yOffset, qrSize, qrSize);

      // URL below QR
      const urlY = yOffset + qrSize + 8;
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      const urlLines = pdf.splitTextToSize(url, pageWidth - 40);
      pdf.text(urlLines, pageWidth / 2, urlY, { align: "center" });

      // "How to Join" instructions
      const instrY = urlY + urlLines.length * 4 + 10;
      pdf.setFontSize(13);
      pdf.setTextColor(35, 31, 31);
      pdf.text("How to Join", pageWidth / 2, instrY, { align: "center" });

      pdf.setFontSize(11);
      pdf.setTextColor(80);
      const instructions = [
        "1. Open your Camera or Google Lens.",
        "2. Point it at the QR Code.",
        "3. Tap the link that appears to sign the attendance sheet.",
      ];
      instructions.forEach((line, i) => {
        pdf.text(line, pageWidth / 2, instrY + 9 + i * 8, { align: "center" });
      });

      pdf.save(`${eventTitle.replace(/\s+/g, "_")}_QR.pdf`);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to generate PDF"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>QR Code — {eventTitle}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-5 py-4">
          <div ref={qrRef} className="p-6 bg-white rounded-xl border"><QRCodeSVG value={url} size={220} /></div>
          <div className="flex w-full gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={handleDownloadPNG}><Download className="w-4 h-4 mr-2" /> PNG</Button>
            <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}><FileText className="w-4 h-4 mr-2" /> PDF (A4)</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRActionsModal;
