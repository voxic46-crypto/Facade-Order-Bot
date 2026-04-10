import { useState } from "react";
import { Link } from "wouter";
import { useListOrders, useListRegions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Eye } from "lucide-react";

export default function Orders() {
  const [regionId, setRegionId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const params: any = {};
  if (regionId && regionId !== "all") params.regionId = parseInt(regionId, 10);
  if (status && status !== "all") params.status = status;

  const { data: orders, isLoading } = useListOrders(params);
  const { data: regions } = useListRegions();

  const getRegionName = (id: number) => regions?.find(r => r.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">View and manage customer facade orders.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions?.map(r => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <div>{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerContact}</div>
                  </TableCell>
                  <TableCell>{getRegionName(order.regionId)}</TableCell>
                  <TableCell className="text-right">{order.totalArea} m²</TableCell>
                  <TableCell className="text-right font-medium">{parseFloat(order.totalCost).toLocaleString("ru-RU")} ₽</TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'completed' ? 'default' : 
                      order.status === 'cancelled' ? 'destructive' : 
                      'secondary'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Eye size={16} /> View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && orders?.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
