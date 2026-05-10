import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDashboardPDF, type ExportData } from "@/lib/export-pdf";

export function ExportButton({ getData }: { getData: () => ExportData }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportDashboardPDF(getData());
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="h-8 px-3 gap-1.5 text-xs border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      {loading ? "A gerar PDF..." : "Exportar PDF"}
    </Button>
  );
}
