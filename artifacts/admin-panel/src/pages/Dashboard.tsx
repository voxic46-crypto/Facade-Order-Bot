import { useListOrders, useListRegions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MapPin, TrendingUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  completed: "Завершён",
  cancelled: "Отменён",
};

export default function Dashboard() {
  const { data: orders, isLoading: loadingOrders } = useListOrders();
  const { data: regions, isLoading: loadingRegions } = useListRegions();

  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === "completed").length || 0;
  const totalRevenue = orders?.reduce((acc, order) => acc + parseFloat(order.totalCost), 0) || 0;

  const getRegionName = (id: number) => regions?.find(r => r.id === id)?.name || "Неизвестно";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Главная</h1>
        <p className="text-muted-foreground mt-1">Обзор работы бота по заказу фасадов.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingOrders ? "..." : totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingOrders ? "..." : completedOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingOrders ? "..." : `${totalRevenue.toLocaleString("ru-RU")} ₽`}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных регионов</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingRegions ? "..." : regions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние заказы</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Регион</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingOrders ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4">Загрузка...</TableCell></TableRow>
              ) : orders && orders.length > 0 ? (
                orders.slice(0, 5).map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{getRegionName(order.regionId)}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{parseFloat(order.totalCost).toLocaleString("ru-RU")} ₽</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-4">Нет заказов</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
