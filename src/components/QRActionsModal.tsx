import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Download, FileText } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface QRActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  eventTitle: string;
  venue?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

const QRActionsModal = ({ open, onOpenChange, url, eventTitle }: QRActionsModalProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

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

      // JKUAT branding
      pdf.setFontSize(12);
      pdf.setTextColor(154, 196, 75);
      pdf.text("JKUAT Industrial Park", pageWidth / 2, 20, { align: "center" });

      pdf.setFontSize(9);
      pdf.setTextColor(150);
      pdf.text("Meeting Attendance System", pageWidth / 2, 27, { align: "center" });

      // Separator
      pdf.setDrawColor(154, 196, 75);
      pdf.setLineWidth(0.5);
      pdf.line(30, 32, pageWidth - 30, 32);

      pdf.setTextColor(35, 31, 31);
      pdf.setFontSize(24);
      pdf.text(eventTitle, pageWidth / 2, 48, { align: "center" });

      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text("Scan to Check In", pageWidth / 2, 58, { align: "center" });

      const qrSize = 120;
      const x = (pageWidth - qrSize) / 2;
      const y = 70;
      pdf.addImage(dataUrl, "PNG", x, y, qrSize, qrSize);

      pdf.setFontSize(10);
      pdf.setTextColor(140);
      const urlLines = pdf.splitTextToSize(url, pageWidth - 40);
      pdf.text(urlLines, pageWidth / 2, y + qrSize + 15, { align: "center" });

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
