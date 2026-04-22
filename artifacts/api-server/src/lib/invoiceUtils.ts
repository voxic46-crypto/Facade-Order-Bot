import * as XLSX from "xlsx";

export interface InvoiceSettingsData {
  supplierName: string;
  supplierInn: string;
  supplierKpp: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  bankName: string;
  bankAccount: string;
  bankBic: string;
  bankCorrespondentAccount: string;
  invoicePrefix: string;
}

export interface InvoiceItem {
  rowNumber: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export function buildInvoiceNumber(prefix: string, orderId: number, date: Date): string {
  const year = date.getFullYear();
  return `${prefix}${year}-${orderId}`;
}

export function generateInvoiceExcel(opts: {
  invoiceNumber: string;
  invoiceDate: Date;
  settings: InvoiceSettingsData;
  customerName: string;
  customerContact: string;
  decorName: string;
  collectionName: string;
  manufacturerName: string;
  pricePerSqm: number;
  pricePerHole: number;
  pricePackagingPerSqm: number;
  items: Array<{
    rowNumber: number;
    height: number;
    width: number;
    quantity: number;
    holes: number;
    area: number;
    facadesCost: number;
    holesCost: number;
    packagingCost: number;
  }>;
  totalArea: number;
  totalFacadesCost: number;
  totalHolesCost: number;
  totalPackagingCost: number;
  totalCost: number;
}): Buffer {
  const wb = XLSX.utils.book_new();
  const s = opts.settings;
  const dateStr = opts.invoiceDate.toLocaleDateString("ru-RU");
  const decorLabel = `МДФ ${opts.manufacturerName} / ${opts.collectionName} / ${opts.decorName}`;

  // Суммарное количество отверстий по всем позициям
  const totalHolesCount = opts.items.reduce((sum, it) => sum + it.holes * it.quantity, 0);

  // Формируем строки позиций счёта
  const invoiceItems: InvoiceItem[] = [];
  let rowNum = 1;

  // Каждый фасад — отдельная строка: размер, площадь, цена за м², сумма
  for (const item of opts.items) {
    invoiceItems.push({
      rowNumber: rowNum++,
      name: `Фасад ${decorLabel}: ${item.height}×${item.width} мм, ${item.quantity} шт.`,
      quantity: item.area,
      unit: "м²",
      price: opts.pricePerSqm,
      total: item.facadesCost,
    });
  }

  // Присадка — кол-во отверстий, цена за отверстие, сумма
  if (opts.totalHolesCost > 0) {
    invoiceItems.push({
      rowNumber: rowNum++,
      name: "Работа по присадке (сверление отверстий под петли)",
      quantity: totalHolesCount,
      unit: "отв.",
      price: opts.pricePerHole,
      total: opts.totalHolesCost,
    });
  }

  // Упаковка — суммарный м² фасадов, цена за м², сумма
  if (opts.totalPackagingCost > 0) {
    invoiceItems.push({
      rowNumber: rowNum++,
      name: "Упаковка",
      quantity: opts.totalArea,
      unit: "м²",
      price: opts.pricePackagingPerSqm,
      total: opts.totalPackagingCost,
    });
  }

  const bankLine = `Банк: ${s.bankName} | БИК: ${s.bankBic} | к/с: ${s.bankCorrespondentAccount}`;
  const supplierLine = `ИНН: ${s.supplierInn}${s.supplierKpp ? ` / КПП: ${s.supplierKpp}` : ""} | ${s.supplierAddress}`;

  const rows: unknown[][] = [
    // Банковские реквизиты — шапка
    [bankLine],
    [`Расчётный счёт: ${s.bankAccount}`],
    [],
    // Заголовок
    [`Счёт на оплату № ${opts.invoiceNumber} от ${dateStr}`],
    [],
    // Поставщик
    ["Поставщик:", s.supplierName || "—"],
    ["", supplierLine],
    [s.supplierPhone ? `Тел.: ${s.supplierPhone}` : "", s.supplierEmail ? `Email: ${s.supplierEmail}` : ""],
    [],
    // Покупатель
    ["Покупатель:", customerName(opts.customerName)],
    ["Контакт:", opts.customerContact],
    [],
    // Таблица — колонки с площадью и ценой за м²
    ["№", "Наименование товара / услуги", "Кол-во / площадь", "Ед.", "Цена за ед. (₽)", "Сумма (₽)"],
  ];

  for (const item of invoiceItems) {
    rows.push([item.rowNumber, item.name, item.quantity, item.unit, item.price, item.total]);
  }

  rows.push([]);
  rows.push(["", "", "", "", "ИТОГО:", opts.totalCost]);
  rows.push(["", "", "", "", "В т.ч. НДС:", "Без НДС"]);
  rows.push([]);
  rows.push([`Итого наименований ${invoiceItems.length}, на сумму ${formatMoney(opts.totalCost)} руб.`]);
  rows.push([`${toWords(opts.totalCost)}`]);
  rows.push([]);
  rows.push(["Руководитель __________________ / ___________________"]);
  rows.push(["Бухгалтер   __________________ / ___________________"]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 60 },
    { wch: 18 },
    { wch: 7 },
    { wch: 18 },
    { wch: 14 },
  ];

  // Ширина колонки A для первой строки (банк)
  XLSX.utils.book_append_sheet(wb, ws, "Счёт");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

function customerName(name: string): string {
  return name || "—";
}

function formatMoney(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
}

// Минимальная конвертация суммы в слова (рубли, без копеек)
function toWords(amount: number): string {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  return `${rubles} руб. ${kopecks < 10 ? "0" + kopecks : kopecks} коп.`;
}
