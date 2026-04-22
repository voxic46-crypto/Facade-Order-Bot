import { useParams, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useListRegions, useListDecors } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, User, MapPin, Calendar, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  completed: "Завершён",
  cancelled: "Отменён",
};

export default function OrderDetail() {
  const params = useParams();
  const orderId = parseInt(params.id || "0", 10);

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const { data: regions } = useListRegions();
  const { data: decors } = useListDecors();

  if (isLoading) {
    return <div className="p-8 text-center">Загрузка данных заказа...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center">Заказ не найден</div>;
  }

  const regionName = regions?.find(r => r.id === order.regionId)?.name || "Неизвестный регион";
  const decorName = decors?.find(d => d.id === order.decorId)?.name || "Неизвестный декор";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="outline" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Заказ #{order.id}</h1>
            <Badge variant={order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-sm">
              {STATUS_LABELS[order.status] || order.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Создан {format(new Date(order.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}</p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" asChild>
            <a href={`/api/orders/${order.id}/invoice`} download>
              <Receipt size={16} /> Скачать счёт
            </a>
          </Button>
          {order.attachedFileUrl && (
            <Button variant="outline" className="gap-2" asChild>
              <a href={order.attachedFileUrl} target="_blank" rel="noreferrer">
                <FileText size={16} /> Файл присадки
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Позиции ({order.items.length})</CardTitle>
            <CardDescription>Декор: <span className="font-semibold">{decorName}</span></CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Размеры</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Отверстия</TableHead>
                  <TableHead className="text-right">Площадь</TableHead>
                  <TableHead className="text-right">Стоимость</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const totalItemCost = parseFloat(item.facadesCost) + parseFloat(item.holesCost) + parseFloat(item.packagingCost);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{item.rowNumber}</TableCell>
                      <TableCell>{item.height} × {item.width} мм</TableCell>
                      <TableCell className="text-right">{item.quantity} шт.</TableCell>
                      <TableCell className="text-right">{item.holes}</TableCell>
                      <TableCell className="text-right">{item.area} м²</TableCell>
                      <TableCell className="text-right font-medium">{totalItemCost.toLocaleString("ru-RU")} ₽</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Данные клиента</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-muted-foreground">📞 {order.customerContact}</div>
                  {(order as any).customerEmail && (
                    <div className="text-muted-foreground">📧 {(order as any).customerEmail}</div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Регион</div>
                  <div className="text-muted-foreground">{regionName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Дата создания</div>
                  <div className="text-muted-foreground">{format(new Date(order.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}</div>
                </div>
              </div>
              {order.invoiceNumber && (
                <div className="flex items-start gap-3">
                  <Receipt className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Счёт на оплату</div>
                    <div className="text-muted-foreground">№ {order.invoiceNumber}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Итого</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Общая площадь</span>
                  <span className="font-medium">{order.totalArea} м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Стоимость фасадов</span>
                  <span>{parseFloat(order.totalFacadesCost).toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Стоимость отверстий</span>
                  <span>{parseFloat(order.totalHolesCost).toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Стоимость упаковки</span>
                  <span>{parseFloat(order.totalPackagingCost).toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center font-bold text-lg">
                <span>ИТОГО</span>
                <span className="text-blue-600">{parseFloat(order.totalCost).toLocaleString("ru-RU")} ₽</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
