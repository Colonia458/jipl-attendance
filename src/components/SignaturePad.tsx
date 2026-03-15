import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signatureValue: string | null) => void;
}

const SignaturePad = ({ onSignatureChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [useTyped, setUseTyped] = useState(false);
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (useTyped) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#231F1F";
  }, [useTyped]);

  useEffect(() => {
    if (!useTyped) return;
    const normalized = typedName.trim();
    onSignatureChange(normalized ? `Typed Signature: ${normalized}` : null);
  }, [useTyped, typedName, onSignatureChange]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (hasDrawn && canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL("image/jpeg", 0.1));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    setHasDrawn(false);
    onSignatureChange(null);
  };

  const handleToggle = (checked: boolean) => {
    setUseTyped(checked);
    setHasDrawn(false);
    setTypedName("");
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Signature or Type Name</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{useTyped ? "Type" : "Draw"}</span>
          <Switch checked={useTyped} onCheckedChange={handleToggle} />
        </div>
      </div>

      {useTyped ? (
        <Input
          placeholder="Type your full name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="font-serif italic text-lg"
        />
      ) : (
        <>
          <div className="relative border border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full touch-none cursor-crosshair"
              style={{ height: 120 }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-muted-foreground/50">Sign here</p>
              </div>
            )}
          </div>
          {hasDrawn && (
            <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
              <Eraser className="w-3 h-3 mr-1" /> Clear Signature
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default SignaturePad;
