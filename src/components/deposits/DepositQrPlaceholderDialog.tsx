import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DepositQrPlaceholderDialogProps {
  address: string;
  networkLabel: string;
  tokenName: string;
}

const DepositQrPlaceholderDialog = ({
  address,
  networkLabel,
  tokenName,
}: DepositQrPlaceholderDialogProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button type="button" variant="outline">
        <QrCode size={16} /> Show QR
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md border-border bg-card">
      <DialogHeader>
        <DialogTitle>{tokenName} QR Space</DialogTitle>
        <DialogDescription>
          This slot is reserved for your custom {networkLabel} QR image. The linked wallet address stays visible below
          for reference.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-2xl border border-dashed border-gold/40 bg-background/60 p-6">
        <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 text-center">
          <div className="max-w-[12rem] space-y-2">
            <div className="text-sm font-semibold text-foreground">QR placeholder</div>
            <p className="text-sm text-muted-foreground">Drop your own wallet QR asset here when you are ready.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Wallet address</div>
        <div className="mt-2 break-all font-mono text-sm text-foreground">{address}</div>
      </div>
    </DialogContent>
  </Dialog>
);

export default DepositQrPlaceholderDialog;
