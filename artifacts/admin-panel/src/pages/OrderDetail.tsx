import { useParams, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useListRegions, useListDecors } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, User, MapPin, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function OrderDetail() {
  const params = useParams();
  const orderId = parseInt(params.id || "0", 10);

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const { data: regions } = useListRegions();
  const { data: decors } = useListDecors();

  if (isLoading) {
    return <div className="p-8 text-center">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center">Order not found</div>;
  }

  const regionName = regions?.find(r => r.id === order.regionId)?.name || "Unknown Region";
  const decorName = decors?.find(d => d.id === order.decorId)?.name || "Unknown Decor";

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
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.id}</h1>
            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-sm">
              {order.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Placed on {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {order.attachedFileUrl && (
            <Button variant="outline" className="gap-2" asChild>
              <a href={order.attachedFileUrl} target="_blank" rel="noreferrer">
                <FileText size={16} /> Original File
              </a>
            </Button>
          )}
          <Button className="gap-2">
            <Download size={16} /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Items ({order.items.length})</CardTitle>
            <CardDescription>Decor: <span className="font-semibold">{decorName}</span></CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Holes</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const totalItemCost = parseFloat(item.facadesCost) + parseFloat(item.holesCost) + parseFloat(item.packagingCost);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{item.rowNumber}</TableCell>
                      <TableCell>{item.height} × {item.width} mm</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.holes}</TableCell>
                      <TableCell className="text-right">{item.area} m²</TableCell>
                      <TableCell className="text-right font-medium">{totalItemCost.toLocaleString("ru-RU")} ₽</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-muted-foreground">{order.customerContact}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Region</div>
                  <div className="text-muted-foreground">{regionName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Created</div>
                  <div className="text-muted-foreground">{format(new Date(order.createdAt), 'dd MMMM yyyy, HH:mm')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Area</span>
                  <span className="font-medium">{order.totalArea} m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facades Cost</span>
                  <span>{parseFloat(order.totalFacadesCost).toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Holes Cost</span>
                  <span>{parseFloat(order.totalHolesCost).toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packaging Cost</span>
                  <span>{parseFloat(order.totalPackagingCost).toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">{parseFloat(order.totalCost).toLocaleString("ru-RU")} ₽</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
