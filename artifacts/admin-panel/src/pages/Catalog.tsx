import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListManufacturers, getListManufacturersQueryKey, useCreateManufacturer, useDeleteManufacturer,
  useListCollections, getListCollectionsQueryKey,
  useListDecors, getListDecorsQueryKey
} from "@workspace/api-client-react";

export default function Catalog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Каталог</h1>
        <p className="text-muted-foreground mt-1">Управление производителями, коллекциями и декорами.</p>
      </div>

      <Tabs defaultValue="manufacturers">
        <TabsList className="w-full max-w-md grid grid-cols-3">
          <TabsTrigger value="manufacturers">Производители</TabsTrigger>
          <TabsTrigger value="collections">Коллекции</TabsTrigger>
          <TabsTrigger value="decors">Декоры</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="manufacturers" className="m-0">
            <ManufacturersTab />
          </TabsContent>
          <TabsContent value="collections" className="m-0">
            <CollectionsTab />
          </TabsContent>
          <TabsContent value="decors" className="m-0">
            <DecorsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ManufacturersTab() {
  const { data, isLoading } = useListManufacturers();
  const createManufacturer = useCreateManufacturer();
  const deleteManufacturer = useDeleteManufacturer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName) return;
    createManufacturer.mutate({ data: { name: newName } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListManufacturersQueryKey() });
        setNewName("");
        toast({ title: "Производитель добавлен" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить этого производителя? Связанные коллекции также могут быть удалены.")) {
      deleteManufacturer.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListManufacturersQueryKey() });
          toast({ title: "Производитель удалён" });
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Производители</CardTitle>
        <CardDescription>Добавляйте и удаляйте производителей фасадов.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end max-w-sm">
          <div className="flex-1 space-y-2">
            <Label>Новый производитель</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="например, Egger" />
          </div>
          <Button onClick={handleAdd} disabled={!newName || createManufacturer.isPending}>Добавить</Button>
        </div>

        <div className="border rounded-md mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">Загрузка...</TableCell></TableRow>
              ) : data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Производители не найдены</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CollectionsTab() {
  const { data, isLoading } = useListCollections();
  const { data: manufacturers } = useListManufacturers();

  const getManufacturerName = (id: number) => manufacturers?.find(m => m.id === id)?.name || "Неизвестно";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Коллекции</CardTitle>
        <CardDescription>Коллекции создаются автоматически при импорте каталога.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Производитель</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">Загрузка...</TableCell></TableRow>
              ) : data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getManufacturerName(item.manufacturerId)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Коллекции не найдены. Загрузите каталог через раздел "Импорт".</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DecorsTab() {
  const { data, isLoading } = useListDecors();
  const { data: collections } = useListCollections();

  const getCollectionName = (id: number) => collections?.find(c => c.id === id)?.name || "Неизвестно";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Декоры</CardTitle>
        <CardDescription>Декоры создаются автоматически при импорте каталога.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Коллекция</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">Загрузка...</TableCell></TableRow>
              ) : data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getCollectionName(item.collectionId)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Декоры не найдены. Загрузите каталог через раздел "Импорт".</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
