import { useState } from "react";
import { useListRegions, useCreateRegion, useUpdateRegion, useDeleteRegion, getListRegionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Regions() {
  const { data: regions, isLoading } = useListRegions();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<{id?: number, name: string, managerEmail: string} | null>(null);

  const handleOpenDialog = (region?: {id: number, name: string, managerEmail: string}) => {
    if (region) {
      setEditingRegion(region);
    } else {
      setEditingRegion({ name: "", managerEmail: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingRegion?.name || !editingRegion?.managerEmail) return;

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListRegionsQueryKey() });
      setIsDialogOpen(false);
      toast({ title: "Готово", description: "Регион успешно сохранён." });
    };

    if (editingRegion.id) {
      updateRegion.mutate({ id: editingRegion.id, data: { name: editingRegion.name, managerEmail: editingRegion.managerEmail } }, { onSuccess });
    } else {
      createRegion.mutate({ data: { name: editingRegion.name, managerEmail: editingRegion.managerEmail } }, { onSuccess });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить этот регион?")) {
      deleteRegion.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRegionsQueryKey() });
          toast({ title: "Готово", description: "Регион удалён." });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Регионы</h1>
          <p className="text-muted-foreground mt-1">Управление регионами и почтами менеджеров.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus size={16} /> Добавить регион
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Email менеджера</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : regions?.map(region => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.id}</TableCell>
                  <TableCell>{region.name}</TableCell>
                  <TableCell>{region.managerEmail}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(region)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(region.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && regions?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Регионы не найдены</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRegion?.id ? "Редактировать регион" : "Добавить регион"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название региона</Label>
              <Input
                value={editingRegion?.name || ""}
                onChange={e => setEditingRegion(prev => prev ? {...prev, name: e.target.value} : null)}
                placeholder="например, Московская область"
              />
            </div>
            <div className="space-y-2">
              <Label>Email менеджера</Label>
              <Input
                type="email"
                value={editingRegion?.managerEmail || ""}
                onChange={e => setEditingRegion(prev => prev ? {...prev, managerEmail: e.target.value} : null)}
                placeholder="manager@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={createRegion.isPending || updateRegion.isPending}>
              {createRegion.isPending || updateRegion.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
