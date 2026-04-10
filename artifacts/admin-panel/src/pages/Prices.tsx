import { useState } from "react";
import { useListPrices, getListPricesQueryKey, useUpdatePrice, useListRegions, useListDecors } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function Prices() {
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const { data: regions } = useListRegions();
  const { data: decors } = useListDecors();
  
  const regionIdNum = selectedRegionId ? parseInt(selectedRegionId, 10) : undefined;
  
  const { data: prices, isLoading } = useListPrices(regionIdNum ? { regionId: regionIdNum } : {});
  const updatePrice = useUpdatePrice();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ sqm: "", hole: "", packaging: "" });

  const handleEdit = (price: any) => {
    setEditingPriceId(price.id);
    setEditValues({
      sqm: price.pricePerSqm,
      hole: price.pricePerHole,
      packaging: price.pricePackagingPerSqm
    });
  };

  const handleSave = (id: number) => {
    updatePrice.mutate({ 
      id, 
      data: { 
        pricePerSqm: editValues.sqm,
        pricePerHole: editValues.hole,
        pricePackagingPerSqm: editValues.packaging
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPricesQueryKey(regionIdNum ? { regionId: regionIdNum } : {}) });
        setEditingPriceId(null);
        toast({ title: "Price updated" });
      }
    });
  };

  const getDecorName = (id: number) => decors?.find(d => d.id === id)?.name || "Unknown";
  const getRegionName = (id: number) => regions?.find(r => r.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prices</h1>
          <p className="text-muted-foreground mt-1">Manage pricing per region and decor.</p>
        </div>
        
        <div className="w-full md:w-64">
          <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions?.map(r => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Decor</TableHead>
                <TableHead>Price / m²</TableHead>
                <TableHead>Price / Hole</TableHead>
                <TableHead>Packaging / m²</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : prices?.map((price) => {
                const isEditing = editingPriceId === price.id;
                
                return (
                  <TableRow key={price.id}>
                    <TableCell>{getRegionName(price.regionId)}</TableCell>
                    <TableCell className="font-medium">{getDecorName(price.decorId)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editValues.sqm} onChange={e => setEditValues(p => ({...p, sqm: e.target.value}))} className="w-24 h-8" />
                      ) : `${price.pricePerSqm} ₽`}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editValues.hole} onChange={e => setEditValues(p => ({...p, hole: e.target.value}))} className="w-24 h-8" />
                      ) : `${price.pricePerHole} ₽`}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editValues.packaging} onChange={e => setEditValues(p => ({...p, packaging: e.target.value}))} className="w-24 h-8" />
                      ) : `${price.pricePackagingPerSqm} ₽`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Button size="sm" onClick={() => handleSave(price.id)} disabled={updatePrice.isPending} className="h-8 gap-1">
                          <Save size={14} /> Save
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(price)} className="h-8">
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && prices?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No prices found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
