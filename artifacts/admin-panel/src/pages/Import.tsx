import { useState } from "react";
import { useListRegions } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileDown, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Creating a manual mutation since useImportCatalog handles multipart form data
const useImportCatalog = () => {
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        body: data,
      });
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    }
  });
};

export default function Import() {
  const { data: regions } = useListRegions();
  const [regionId, setRegionId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const importCatalog = useImportCatalog();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!regionId || !file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("regionId", regionId);

    importCatalog.mutate(formData, {
      onSuccess: (data) => {
        toast({ title: "Import completed", description: data.message });
      },
      onError: () => {
        toast({ title: "Import failed", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Catalog</h1>
        <p className="text-muted-foreground mt-1">Upload Excel or CSV files to update the catalog and prices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Select a region and upload the pricing file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Target Region</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region..." />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File (CSV, Excel)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50 border-slate-200">
                <UploadCloud className="h-8 w-8 text-slate-400" />
                <div className="text-sm">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv,.xlsx,.xls" />
                  </label>
                  <p className="text-slate-500">or drag and drop</p>
                </div>
                {file && <p className="text-sm font-medium text-slate-900">{file.name}</p>}
              </div>
            </div>

            <Button onClick={handleUpload} disabled={!regionId || !file || importCatalog.isPending} className="w-full">
              {importCatalog.isPending ? "Importing..." : "Start Import"}
            </Button>

            {importCatalog.data && (
              <Alert variant={importCatalog.data.success ? "default" : "destructive"} className="mt-4">
                {importCatalog.data.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{importCatalog.data.success ? "Success" : "Errors occurred"}</AlertTitle>
                <AlertDescription>
                  <p>Imported: {importCatalog.data.imported} items</p>
                  {importCatalog.data.errors && importCatalog.data.errors.length > 0 && (
                    <ul className="list-disc pl-4 mt-2 text-xs opacity-80 max-h-32 overflow-y-auto">
                      {importCatalog.data.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Format Requirements</CardTitle>
            <CardDescription>Ensure your file matches exactly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-slate-950 p-4 overflow-x-auto">
              <table className="text-sm text-slate-300 min-w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-100">
                    <th className="pb-2 text-left pr-4">Производитель</th>
                    <th className="pb-2 text-left pr-4">Коллекция</th>
                    <th className="pb-2 text-left pr-4">Декор</th>
                    <th className="pb-2 text-right pr-4">Цена за м2</th>
                    <th className="pb-2 text-right pr-4">Цена за отверстие</th>
                    <th className="pb-2 text-right">Цена упаковки за м2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 pr-4">Egger</td>
                    <td className="py-2 pr-4">Wood</td>
                    <td className="py-2 pr-4">Oak Classic</td>
                    <td className="py-2 pr-4 text-right">1500.00</td>
                    <td className="py-2 pr-4 text-right">50.00</td>
                    <td className="py-2 text-right">200.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Note: The importer will automatically create missing Manufacturers, Collections, and Decors. 
              Prices will be created or updated for the selected region.
            </p>
            <Button variant="outline" className="w-full gap-2">
              <FileDown size={16} /> Download Sample Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
