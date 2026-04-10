import * as XLSX from "xlsx";

interface OrderItemInput {
  rowNumber: number;
  height: number;
  width: number;
  quantity: number;
  holes: number;
}

interface CalculatedItem {
  rowNumber: number;
  height: number;
  width: number;
  quantity: number;
  holes: number;
  area: number;
  facadesCost: number;
  holesCost: number;
  packagingCost: number;
}

export function calculateItems(
  items: OrderItemInput[],
  pricePerSqm: number,
  pricePerHole: number,
  pricePackagingPerSqm: number,
): {
  calculated: CalculatedItem[];
  totalArea: number;
  totalFacadesCost: number;
  totalHolesCost: number;
  totalPackagingCost: number;
  totalCost: number;
} {
  let totalArea = 0;
  let totalFacadesCost = 0;
  let totalHolesCost = 0;
  let totalPackagingCost = 0;

  const calculated: CalculatedItem[] = items.map((item) => {
    const areaOne = (item.height / 1000) * (item.width / 1000);
    const area = areaOne * item.quantity;
    const facadesCost = area * pricePerSqm;
    const holesCost = item.holes * item.quantity * pricePerHole;
    const packagingCost = area * pricePackagingPerSqm;

    totalArea += area;
    totalFacadesCost += facadesCost;
    totalHolesCost += holesCost;
    totalPackagingCost += packagingCost;

    return {
      rowNumber: item.rowNumber,
      height: item.height,
      width: item.width,
      quantity: item.quantity,
      holes: item.holes,
      area: Math.round(area * 10000) / 10000,
      facadesCost: Math.round(facadesCost * 100) / 100,
      holesCost: Math.round(holesCost * 100) / 100,
      packagingCost: Math.round(packagingCost * 100) / 100,
    };
  });

  return {
    calculated,
    totalArea: Math.round(totalArea * 10000) / 10000,
    totalFacadesCost: Math.round(totalFacadesCost * 100) / 100,
    totalHolesCost: Math.round(totalHolesCost * 100) / 100,
    totalPackagingCost: Math.round(totalPackagingCost * 100) / 100,
    totalCost: Math.round((totalFacadesCost + totalHolesCost + totalPackagingCost) * 100) / 100,
  };
}

export function generateOrderExcel(opts: {
  orderId: number;
  customerName: string;
  customerContact: string;
  regionName: string;
  manufacturerName: string;
  collectionName: string;
  decorName: string;
  items: CalculatedItem[];
  totalArea: number;
  totalFacadesCost: number;
  totalHolesCost: number;
  totalPackagingCost: number;
  totalCost: number;
  createdAt: Date;
}): Buffer {
  const wb = XLSX.utils.book_new();

  const headerRows = [
    ["БЛАНК-ЗАКАЗ ФАСАДОВ"],
    [],
    ["№ заказа:", opts.orderId],
    ["Дата:", opts.createdAt.toLocaleDateString("ru-RU")],
    ["Клиент:", opts.customerName],
    ["Контакт:", opts.customerContact],
    ["Регион:", opts.regionName],
    ["Производитель:", opts.manufacturerName],
    ["Коллекция:", opts.collectionName],
    ["Декор:", opts.decorName],
    [],
    ["№", "Высота (мм)", "Ширина (мм)", "Кол-во (шт)", "Отверстий под петли", "Площадь (м²)", "Стоимость фасадов (₽)", "Стоимость отверстий (₽)", "Стоимость упаковки (₽)"],
  ];

  const dataRows = opts.items.map((item) => [
    item.rowNumber,
    item.height,
    item.width,
    item.quantity,
    item.holes,
    item.area,
    item.facadesCost,
    item.holesCost,
    item.packagingCost,
  ]);

  const summaryRows = [
    [],
    ["", "", "", "", "ИТОГО:", opts.totalArea, opts.totalFacadesCost, opts.totalHolesCost, opts.totalPackagingCost],
    [],
    ["ИТОГОВАЯ СТОИМОСТЬ ЗАКАЗА:", "", "", "", "", "", "", "", opts.totalCost],
  ];

  const allRows = [...headerRows, ...dataRows, ...summaryRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 26 }, { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Заказ");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

export function buildOrderEmailHtml(opts: {
  orderId: number;
  customerName: string;
  customerContact: string;
  regionName: string;
  decorName: string;
  collectionName: string;
  manufacturerName: string;
  totalArea: number;
  totalFacadesCost: number;
  totalHolesCost: number;
  totalPackagingCost: number;
  totalCost: number;
  itemsCount: number;
  createdAt: Date;
}): string {
  return `
    <h2>Новый заказ фасадов #${opts.orderId}</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><b>Клиент</b></td><td>${opts.customerName}</td></tr>
      <tr><td><b>Контакт</b></td><td>${opts.customerContact}</td></tr>
      <tr><td><b>Регион</b></td><td>${opts.regionName}</td></tr>
      <tr><td><b>Производитель</b></td><td>${opts.manufacturerName}</td></tr>
      <tr><td><b>Коллекция</b></td><td>${opts.collectionName}</td></tr>
      <tr><td><b>Декор</b></td><td>${opts.decorName}</td></tr>
      <tr><td><b>Кол-во позиций</b></td><td>${opts.itemsCount} шт.</td></tr>
      <tr><td><b>Общая площадь</b></td><td>${opts.totalArea} м²</td></tr>
      <tr><td><b>Стоимость фасадов</b></td><td>${opts.totalFacadesCost} ₽</td></tr>
      <tr><td><b>Стоимость отверстий</b></td><td>${opts.totalHolesCost} ₽</td></tr>
      <tr><td><b>Стоимость упаковки</b></td><td>${opts.totalPackagingCost} ₽</td></tr>
      <tr><td><b>ИТОГО</b></td><td><b>${opts.totalCost} ₽</b></td></tr>
    </table>
    <p>Бланк-заказ во вложении.</p>
    <p style="color:#888;font-size:12px">Заказ создан: ${opts.createdAt.toLocaleString("ru-RU")}</p>
  `;
}
