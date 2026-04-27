import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// QR-код лежит рядом со скриптом в dist/assets/ (скопирован build.mjs)
const QR_PATH = path.join(__dirname, "assets", "qr-payment.jpg");

function loadQrBase64(): string | null {
  try {
    return readFileSync(QR_PATH).toString("base64");
  } catch {
    return null;
  }
}

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

export async function generateInvoiceExcel(opts: {
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
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FacadeBot";
  const ws = wb.addWorksheet("Счёт");

  const s = opts.settings;
  const dateStr = opts.invoiceDate.toLocaleDateString("ru-RU");
  const decorLabel = `МДФ ${opts.manufacturerName} / ${opts.collectionName} / ${opts.decorName}`;

  // ── Ширина колонок ──────────────────────────────────────────────────────────
  ws.columns = [
    { key: "A", width: 5 },   // №
    { key: "B", width: 58 },  // Наименование
    { key: "C", width: 18 },  // Кол-во
    { key: "D", width: 8 },   // Ед.
    { key: "E", width: 18 },  // Цена
    { key: "F", width: 14 },  // Сумма
    { key: "G", width: 18 },  // (резерв под QR)
  ];

  // ── Стили ──────────────────────────────────────────────────────────────────
  const bold: Partial<ExcelJS.Font> = { bold: true, name: "Calibri", size: 11 };
  const normal: Partial<ExcelJS.Font> = { name: "Calibri", size: 10 };
  const header: Partial<ExcelJS.Font> = { bold: true, name: "Calibri", size: 13 };
  const grayFill: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" },
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };

  function addRow(values: (string | number | null)[], font: Partial<ExcelJS.Font> = normal): ExcelJS.Row {
    const row = ws.addRow(values);
    row.font = font;
    row.height = 16;
    return row;
  }

  function addEmpty(): void {
    ws.addRow([]).height = 6;
  }

  // ── 1. Банковские реквизиты ──────────────────────────────────────────────
  const r1 = addRow([`${s.bankName}  |  БИК: ${s.bankBic}  |  к/с: ${s.bankCorrespondentAccount}`], bold);
  ws.mergeCells(`A${r1.number}:F${r1.number}`);

  const r2 = addRow([`Расчётный счёт: ${s.bankAccount}`], bold);
  ws.mergeCells(`A${r2.number}:F${r2.number}`);

  addEmpty();

  // ── 2. Заголовок счёта ────────────────────────────────────────────────────
  const r4 = ws.addRow([`Счёт на оплату № ${opts.invoiceNumber} от ${dateStr}`]);
  r4.font = header;
  r4.height = 20;
  ws.mergeCells(`A${r4.number}:F${r4.number}`);

  addEmpty();

  // ── 3. Поставщик ──────────────────────────────────────────────────────────
  const r6 = addRow(["Поставщик:", s.supplierName], bold);
  ws.mergeCells(`B${r6.number}:F${r6.number}`);

  const r7 = addRow(["", `ИНН: ${s.supplierInn}${s.supplierKpp ? ` / КПП: ${s.supplierKpp}` : ""}  |  ${s.supplierAddress}`]);
  ws.mergeCells(`B${r7.number}:F${r7.number}`);

  const contactParts = [
    s.supplierPhone ? `Тел.: ${s.supplierPhone}` : "",
    s.supplierEmail ? `Email: ${s.supplierEmail}` : "",
  ].filter(Boolean).join("   ");
  const r8 = addRow(["", contactParts]);
  ws.mergeCells(`B${r8.number}:F${r8.number}`);

  addEmpty();

  // ── 4. Покупатель ─────────────────────────────────────────────────────────
  const r10 = addRow(["Покупатель:", opts.customerName || "—"], bold);
  ws.mergeCells(`B${r10.number}:F${r10.number}`);

  const r11 = addRow(["Контакт:", opts.customerContact]);
  ws.mergeCells(`B${r11.number}:F${r11.number}`);

  addEmpty();

  // ── 5. Таблица позиций ────────────────────────────────────────────────────
  const tableHeaderRow = ws.addRow(["№", "Наименование товара / услуги", "Кол-во / пл.", "Ед.", "Цена (₽)", "Сумма (₽)"]);
  tableHeaderRow.font = { ...bold, size: 10 };
  tableHeaderRow.height = 18;
  tableHeaderRow.fill = grayFill;
  tableHeaderRow.eachCell((cell) => {
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  // Строки позиций
  const totalHolesCount = opts.items.reduce((sum, it) => sum + it.holes * it.quantity, 0);
  let rowNum = 1;

  for (const item of opts.items) {
    const r = ws.addRow([
      rowNum++,
      `Фасад ${decorLabel}: ${item.height}×${item.width} мм, ${item.quantity} шт.`,
      +item.area.toFixed(3),
      "м²",
      opts.pricePerSqm,
      +item.facadesCost.toFixed(2),
    ]);
    r.font = normal;
    r.height = 16;
    r.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    r.getCell("A").alignment = { horizontal: "center", vertical: "middle" };
    r.getCell("C").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("E").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("F").alignment = { horizontal: "right", vertical: "middle" };
  }

  if (opts.totalHolesCost > 0) {
    const r = ws.addRow([
      rowNum++,
      "Присадка (сверление отверстий под петли)",
      totalHolesCount,
      "отв.",
      opts.pricePerHole,
      +opts.totalHolesCost.toFixed(2),
    ]);
    r.font = normal;
    r.height = 16;
    r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = { vertical: "middle" }; });
    r.getCell("A").alignment = { horizontal: "center", vertical: "middle" };
    r.getCell("C").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("E").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("F").alignment = { horizontal: "right", vertical: "middle" };
  }

  if (opts.totalPackagingCost > 0) {
    const r = ws.addRow([
      rowNum++,
      "Упаковка",
      +opts.totalArea.toFixed(3),
      "м²",
      opts.pricePackagingPerSqm,
      +opts.totalPackagingCost.toFixed(2),
    ]);
    r.font = normal;
    r.height = 16;
    r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = { vertical: "middle" }; });
    r.getCell("A").alignment = { horizontal: "center", vertical: "middle" };
    r.getCell("C").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("E").alignment = { horizontal: "right", vertical: "middle" };
    r.getCell("F").alignment = { horizontal: "right", vertical: "middle" };
  }

  addEmpty();

  // ── 6. Итоговые строки ────────────────────────────────────────────────────
  const itemCount = opts.items.length + (opts.totalHolesCost > 0 ? 1 : 0) + (opts.totalPackagingCost > 0 ? 1 : 0);

  const rTotal = ws.addRow(["", "", "", "", "ИТОГО:", +opts.totalCost.toFixed(2)]);
  ws.mergeCells(`A${rTotal.number}:D${rTotal.number}`);
  rTotal.font = { ...bold, size: 11 };
  rTotal.height = 18;
  rTotal.getCell("E").fill = grayFill;
  rTotal.getCell("F").fill = grayFill;
  rTotal.getCell("E").border = thinBorder;
  rTotal.getCell("F").border = thinBorder;
  rTotal.getCell("E").alignment = { horizontal: "right" };
  rTotal.getCell("F").alignment = { horizontal: "right" };

  const rNds = ws.addRow(["", "", "", "", "В т.ч. НДС:", "Без НДС"]);
  ws.mergeCells(`A${rNds.number}:D${rNds.number}`);
  rNds.font = normal;
  rNds.height = 16;
  rNds.getCell("E").alignment = { horizontal: "right" };
  rNds.getCell("F").alignment = { horizontal: "center" };

  addEmpty();

  const rSummary = ws.addRow([`Итого наименований ${itemCount}, на сумму ${formatMoney(opts.totalCost)} руб.`]);
  ws.mergeCells(`A${rSummary.number}:F${rSummary.number}`);
  rSummary.font = { ...normal, italic: true };
  rSummary.height = 16;

  const rWords = ws.addRow([toWords(opts.totalCost)]);
  ws.mergeCells(`A${rWords.number}:F${rWords.number}`);
  rWords.font = { ...bold, size: 10 };
  rWords.height = 16;

  addEmpty();
  addEmpty();

  // ── 7. QR-код для оплаты ─────────────────────────────────────────────────
  const qrBase64 = loadQrBase64();
  if (qrBase64) {
    const qrLabel = ws.addRow(["QR-код для оплаты"]);
    ws.mergeCells(`A${qrLabel.number}:F${qrLabel.number}`);
    qrLabel.font = { ...bold, size: 10, color: { argb: "FF374151" } };
    qrLabel.height = 16;

    // Зарезервировать строки для картинки (~120px ≈ 9 строк по 15pt)
    const qrStartRow = qrLabel.number + 1;
    for (let i = 0; i < 9; i++) {
      const r = ws.addRow([]);
      r.height = 20;
    }

    const imgId = wb.addImage({ base64: qrBase64, extension: "jpeg" });
    // Вставляем QR в диапазон A..C (строки зарезервированы выше)
    ws.addImage(imgId, `A${qrStartRow}:C${qrStartRow + 9}`);

    addEmpty();
  }

  // ── 8. Подписи ────────────────────────────────────────────────────────────
  const rSig1 = ws.addRow(["Руководитель __________________ / ___________________"]);
  ws.mergeCells(`A${rSig1.number}:F${rSig1.number}`);
  rSig1.font = normal;
  rSig1.height = 18;

  const rSig2 = ws.addRow(["Бухгалтер   __________________ / ___________________"]);
  ws.mergeCells(`A${rSig2.number}:F${rSig2.number}`);
  rSig2.font = normal;
  rSig2.height = 18;

  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}

function formatMoney(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
}

function toWords(amount: number): string {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  return `${rubles} руб. ${kopecks < 10 ? "0" + kopecks : kopecks} коп.`;
}
