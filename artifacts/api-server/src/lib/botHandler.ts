import { db, regionsTable, manufacturersTable, collectionsTable, decorsTable, pricesTable, ordersTable, orderItemsTable, invoiceSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { calculateItems, generateOrderExcel, buildOrderEmailHtml } from "./orderUtils";
import { buildInvoiceNumber, generateInvoiceExcel, type InvoiceSettingsData } from "./invoiceUtils";
import { sendOrderEmail } from "./email";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG_API = () => `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function tgRequest(method: string, params: Record<string, unknown>): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping Telegram API call");
    return;
  }
  try {
    const resp = await fetch(`${TG_API()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.warn({ status: resp.status, text }, "Telegram API error");
    }
  } catch (err) {
    logger.error({ err }, "Failed to call Telegram API");
  }
}

async function sendMessage(chatId: number, text: string, reply_markup?: object): Promise<void> {
  await tgRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(reply_markup ? { reply_markup } : {}),
  });
}

async function answerCallbackQuery(id: string): Promise<void> {
  await tgRequest("answerCallbackQuery", { callback_query_id: id });
}

async function sendDocumentBuffer(chatId: number, buffer: Buffer, filename: string, caption?: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("document", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    if (caption) form.append("caption", caption);
    const resp = await fetch(`${TG_API()}/sendDocument`, { method: "POST", body: form });
    if (!resp.ok) {
      const text = await resp.text();
      logger.warn({ status: resp.status, text }, "Telegram sendDocument error");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send document to Telegram");
  }
}

// Получить URL файла из Telegram по file_id
async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const resp = await fetch(`${TG_API()}/getFile?file_id=${fileId}`);
    const data = await resp.json() as { ok: boolean; result?: { file_path?: string } };
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (err) {
    logger.error({ err }, "Failed to get file from Telegram");
  }
  return null;
}

// Скачать файл из Telegram для вложения в email
async function downloadTelegramFile(fileUrl: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(fileUrl);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.error({ err }, "Failed to download Telegram file");
    return null;
  }
}

type BotState = {
  step: string;
  regionId?: number;
  regionName?: string;
  manufacturerId?: number;
  collectionId?: number;
  decorId?: number;
  decorName?: string;
  collectionName?: string;
  manufacturerName?: string;
  customerName?: string;
  customerContact?: string;
  items?: Array<{ rowNumber: number; height: number; width: number; quantity: number; holes: number }>;
  pricePerSqm?: number;
  pricePerHole?: number;
  pricePackagingPerSqm?: number;
  attachedFileId?: string;
  attachedFileName?: string;
  attachedFileUrl?: string;
};

const sessions = new Map<string, BotState>();

export async function handleBotUpdate(update: Record<string, unknown>): Promise<void> {
  // --- Нажатие кнопки (callback_query) ---
  if (update.callback_query) {
    const cb = update.callback_query as Record<string, unknown>;
    const cbMessage = cb.message as Record<string, unknown> | undefined;
    const from = cb.from as Record<string, unknown> | undefined;
    const chatId = (cbMessage?.chat as Record<string, unknown> | undefined)?.id as number | undefined;
    const userId = String(from?.id ?? "");
    const data = String(cb.data ?? "").trim();

    if (!chatId || !userId) return;
    await answerCallbackQuery(String(cb.id));

    const state = sessions.get(userId) ?? { step: "start" };
    await processStep(userId, chatId, data, state, null);
    return;
  }

  // --- Обычное сообщение ---
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return;

  const from = message.from as Record<string, unknown> | undefined;
  const chat = message.chat as Record<string, unknown> | undefined;
  const chatId = chat?.id as number | undefined;
  const userId = String(from?.id ?? "");
  const text = String((message.text as string | undefined) ?? "").trim();

  if (!chatId || !userId) return;

  const state = sessions.get(userId) ?? { step: "start" };

  if (text === "/start") {
    sessions.set(userId, { step: "select_region" });
    await sendSelectRegion(chatId);
    return;
  }

  // --- Обработка файла (document / photo) ---
  const document = message.document as Record<string, unknown> | undefined;
  const photo = message.photo as Array<Record<string, unknown>> | undefined;

  if ((document || photo) && state.step === "attach_file") {
    let fileId: string;
    let fileName: string;

    if (document) {
      fileId = String(document.file_id ?? "");
      fileName = String(document.file_name ?? `присадка_${Date.now()}`);
    } else {
      // photo — берём наибольший размер
      const largest = photo![photo!.length - 1];
      fileId = String(largest.file_id ?? "");
      fileName = `присадка_${Date.now()}.jpg`;
    }

    const fileUrl = await getTelegramFileUrl(fileId);

    state.attachedFileId = fileId;
    state.attachedFileName = fileName;
    state.attachedFileUrl = fileUrl ?? undefined;
    state.step = "confirm";
    sessions.set(userId, state);

    await sendMessage(chatId, `📎 Файл *«${fileName}»* прикреплён к заказу.\n\nПроверьте детали и подтвердите заказ:`);
    await sendOrderConfirmation(chatId, state);
    return;
  }

  await processStep(userId, chatId, text, state, null);
}

// ─────────────────────────────────────────────
//  Вспомогательные функции меню
// ─────────────────────────────────────────────

async function sendSelectRegion(chatId: number): Promise<void> {
  const regions = await db.select().from(regionsTable).orderBy(regionsTable.name);
  if (!regions.length) {
    await sendMessage(chatId, "В системе пока нет регионов. Обратитесь к администратору.");
    return;
  }
  const inline_keyboard = regions.map((r) => [{ text: r.name, callback_data: `r:${r.id}` }]);
  await sendMessage(chatId, "👋 Добро пожаловать!\n\nВыберите ваш регион:", { inline_keyboard });
}

async function sendSelectManufacturer(chatId: number): Promise<void> {
  const manufacturers = await db.select().from(manufacturersTable).orderBy(manufacturersTable.name);
  if (!manufacturers.length) {
    await sendMessage(chatId, "В системе нет производителей. Обратитесь к администратору.");
    return;
  }
  const inline_keyboard = manufacturers.map((m) => [{ text: m.name, callback_data: `m:${m.id}` }]);
  await sendMessage(chatId, "Выберите производителя:", { inline_keyboard });
}

async function sendSelectCollection(chatId: number, manufacturerId: number): Promise<void> {
  const collections = await db.select().from(collectionsTable).where(eq(collectionsTable.manufacturerId, manufacturerId)).orderBy(collectionsTable.name);
  if (!collections.length) {
    await sendMessage(chatId, "Нет доступных коллекций для этого производителя.");
    return;
  }
  const inline_keyboard = collections.map((c) => [{ text: c.name, callback_data: `c:${c.id}` }]);
  await sendMessage(chatId, "Выберите коллекцию:", { inline_keyboard });
}

async function sendSelectDecor(chatId: number, collectionId: number, regionId: number): Promise<void> {
  const decors = await db.select().from(decorsTable).where(eq(decorsTable.collectionId, collectionId)).orderBy(decorsTable.name);
  if (!decors.length) {
    await sendMessage(chatId, "Нет доступных декоров для этой коллекции.");
    return;
  }
  const pricesInRegion = await db.select().from(pricesTable).where(eq(pricesTable.regionId, regionId));
  const decorIdsWithPrice = new Set(pricesInRegion.map((p) => p.decorId));
  const available = decors.filter((d) => decorIdsWithPrice.has(d.id));

  if (!available.length) {
    await sendMessage(chatId, "Нет декоров с прайсом для вашего региона в этой коллекции. Попробуйте другую коллекцию.");
    return;
  }

  const inline_keyboard = available.map((d) => [{ text: d.name, callback_data: `d:${d.id}` }]);
  await sendMessage(chatId, "Выберите декор:", { inline_keyboard });
}

async function askForFile(chatId: number): Promise<void> {
  const inline_keyboard = [[{ text: "⏩ Пропустить", callback_data: "skip_file" }]];
  await sendMessage(
    chatId,
    `📂 *Файл присадки (необязательно)*\n\n` +
    `Если у вас есть схема присадки фасадов — отправьте файл (PDF, DXF, Excel, фото и т.д.).\n\n` +
    `Файл будет приложен к заказу и отправлен менеджеру.\n\n` +
    `Если присадка не нужна — нажмите кнопку ниже.`,
    { inline_keyboard }
  );
}

// ─────────────────────────────────────────────
//  Основная машина состояний
// ─────────────────────────────────────────────

async function processStep(
  userId: string,
  chatId: number,
  text: string,
  state: BotState,
  _unused: null
): Promise<void> {

  // --- Выбор региона ---
  if (state.step === "select_region") {
    if (text.startsWith("r:")) {
      const regionId = parseInt(text.slice(2), 10);
      const [region] = await db.select().from(regionsTable).where(eq(regionsTable.id, regionId));
      if (!region) { await sendSelectRegion(chatId); return; }
      state.regionId = region.id;
      state.regionName = region.name;
      state.step = "select_manufacturer";
      sessions.set(userId, state);
      await sendSelectManufacturer(chatId);
    } else {
      await sendSelectRegion(chatId);
    }
    return;
  }

  // --- Выбор производителя ---
  if (state.step === "select_manufacturer") {
    if (text.startsWith("m:")) {
      const manufacturerId = parseInt(text.slice(2), 10);
      const [manufacturer] = await db.select().from(manufacturersTable).where(eq(manufacturersTable.id, manufacturerId));
      if (!manufacturer) { await sendSelectManufacturer(chatId); return; }
      state.manufacturerId = manufacturer.id;
      state.manufacturerName = manufacturer.name;
      state.step = "select_collection";
      sessions.set(userId, state);
      await sendSelectCollection(chatId, manufacturerId);
    } else {
      await sendSelectManufacturer(chatId);
    }
    return;
  }

  // --- Выбор коллекции ---
  if (state.step === "select_collection") {
    if (text.startsWith("c:")) {
      const collectionId = parseInt(text.slice(2), 10);
      const [collection] = await db.select().from(collectionsTable).where(eq(collectionsTable.id, collectionId));
      if (!collection) { await sendSelectCollection(chatId, state.manufacturerId!); return; }
      state.collectionId = collection.id;
      state.collectionName = collection.name;
      state.step = "select_decor";
      sessions.set(userId, state);
      await sendSelectDecor(chatId, collectionId, state.regionId!);
    } else {
      await sendSelectCollection(chatId, state.manufacturerId!);
    }
    return;
  }

  // --- Выбор декора ---
  if (state.step === "select_decor") {
    if (text.startsWith("d:")) {
      const decorId = parseInt(text.slice(2), 10);
      const [decor] = await db.select().from(decorsTable).where(eq(decorsTable.id, decorId));
      if (!decor) { await sendSelectDecor(chatId, state.collectionId!, state.regionId!); return; }

      const [priceRow] = await db.select().from(pricesTable).where(
        and(eq(pricesTable.regionId, state.regionId!), eq(pricesTable.decorId, decorId))
      );
      if (!priceRow) {
        await sendMessage(chatId, `Для декора "${decor.name}" нет прайса в вашем регионе. Выберите другой.`);
        await sendSelectDecor(chatId, state.collectionId!, state.regionId!);
        return;
      }

      state.decorId = decor.id;
      state.decorName = decor.name;
      state.pricePerSqm = parseFloat(priceRow.pricePerSqm);
      state.pricePerHole = parseFloat(priceRow.pricePerHole);
      state.pricePackagingPerSqm = parseFloat(priceRow.pricePackagingPerSqm);
      state.items = [];
      state.step = "enter_customer_name";
      sessions.set(userId, state);
      await sendMessage(chatId, `✅ Выбран декор: *${decor.name}*\n\nВведите ваше имя и фамилию:`);
    } else {
      await sendSelectDecor(chatId, state.collectionId!, state.regionId!);
    }
    return;
  }

  // --- Имя клиента ---
  if (state.step === "enter_customer_name") {
    if (!text || text.length < 2) {
      await sendMessage(chatId, "Пожалуйста, введите ваше имя и фамилию:");
      return;
    }
    state.customerName = text;
    state.step = "enter_customer_contact";
    sessions.set(userId, state);
    await sendMessage(chatId, "Введите ваш номер телефона или e-mail для связи:");
    return;
  }

  // --- Контакт клиента ---
  if (state.step === "enter_customer_contact") {
    if (!text) {
      await sendMessage(chatId, "Введите ваш номер телефона или e-mail:");
      return;
    }
    state.customerContact = text;
    state.items = [];
    state.step = "enter_items";
    sessions.set(userId, state);
    await sendMessage(
      chatId,
      `Спасибо, *${state.customerName}*! 👍\n\n` +
      `Теперь введите позиции фасадов по одной строке.\n\n` +
      `*Формат:* высота ширина количество отверстия\n` +
      `*Пример:* \`720 596 2 2\`\n\n` +
      `Высота и ширина в мм. Отверстия — общее количество на все фасады данной позиции.\n\n` +
      `Когда введёте все позиции — напишите *готово*`
    );
    return;
  }

  // --- Ввод позиций ---
  if (state.step === "enter_items") {
    const lower = text.toLowerCase();
    if (lower === "готово" || lower === "/готово") {
      if (!state.items || state.items.length === 0) {
        await sendMessage(chatId, "Вы не добавили ни одной позиции.\n\nВведите позицию в формате:\n`высота ширина количество отверстия`\n\nПример: `720 596 2 2`");
        return;
      }
      // Переходим к шагу прикрепления файла
      state.step = "attach_file";
      sessions.set(userId, state);
      await askForFile(chatId);
    } else {
      const parsed = parseItemLine(text);
      if (!parsed) {
        await sendMessage(chatId, `❌ Неверный формат.\n\nВведите: \`высота ширина количество отверстия\`\nПример: \`720 596 2 2\``);
        return;
      }
      if (!state.items) state.items = [];
      parsed.rowNumber = state.items.length + 1;
      state.items.push(parsed);
      sessions.set(userId, state);
      await sendMessage(
        chatId,
        `✅ Позиция ${parsed.rowNumber} добавлена:\n` +
        `${parsed.height}×${parsed.width} мм, ${parsed.quantity} шт., ${parsed.holes} отв.\n\n` +
        `Введите следующую позицию или напишите *готово*`
      );
    }
    return;
  }

  // --- Прикрепление файла (текстовые команды) ---
  if (state.step === "attach_file") {
    if (text === "skip_file") {
      // Пропустить файл
      state.step = "confirm";
      sessions.set(userId, state);
      await sendOrderConfirmation(chatId, state);
    } else {
      // Напоминаем что нужно отправить файл или пропустить
      await askForFile(chatId);
    }
    return;
  }

  // --- Подтверждение ---
  if (state.step === "confirm") {
    if (text === "confirm:yes") {
      await createAndSendOrder(chatId, userId, state);
    } else if (text === "confirm:no") {
      sessions.delete(userId);
      await sendMessage(chatId, "Заказ отменён.\n\nДля нового заказа введите /start");
    } else {
      await sendOrderConfirmation(chatId, state);
    }
    return;
  }

  await sendMessage(chatId, "Введите /start чтобы начать оформление заказа.");
}

// ─────────────────────────────────────────────
//  Парсинг строки позиции
// ─────────────────────────────────────────────

function parseItemLine(text: string): { rowNumber: number; height: number; width: number; quantity: number; holes: number } | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const height = parseFloat(parts[0]);
  const width = parseFloat(parts[1]);
  const quantity = parseInt(parts[2], 10);
  const holes = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
  if (isNaN(height) || isNaN(width) || isNaN(quantity) || height <= 0 || width <= 0 || quantity <= 0) return null;
  return { rowNumber: 0, height, width, quantity, holes: isNaN(holes) ? 0 : holes };
}

// ─────────────────────────────────────────────
//  Подтверждение заказа
// ─────────────────────────────────────────────

async function sendOrderConfirmation(chatId: number, state: BotState): Promise<void> {
  if (!state.items?.length) return;

  const { calculated, totalArea, totalFacadesCost, totalHolesCost, totalPackagingCost, totalCost } = calculateItems(
    state.items,
    state.pricePerSqm!,
    state.pricePerHole!,
    state.pricePackagingPerSqm!,
  );

  let itemsText = "";
  for (const item of calculated) {
    itemsText += `${item.rowNumber}. ${item.height}×${item.width} мм × ${item.quantity} шт. | ${item.holes} отв. | ${item.area} м² | ${item.facadesCost} ₽\n`;
  }

  const fileLine = state.attachedFileName
    ? `📎 Файл присадки: *${state.attachedFileName}*\n`
    : `📎 Файл присадки: не приложен\n`;

  const confirmText =
    `📋 *Подтверждение заказа*\n\n` +
    `🗺 Регион: ${state.regionName}\n` +
    `🏭 Производитель: ${state.manufacturerName}\n` +
    `📦 Коллекция: ${state.collectionName}\n` +
    `🎨 Декор: ${state.decorName}\n` +
    `👤 Клиент: ${state.customerName}\n` +
    `📞 Контакт: ${state.customerContact}\n` +
    fileLine +
    `\n*Позиции:*\n${itemsText}\n` +
    `📐 Общая площадь: ${totalArea} м²\n` +
    `💰 Стоимость фасадов: ${totalFacadesCost} ₽\n` +
    `🔩 Стоимость отверстий: ${totalHolesCost} ₽\n` +
    `📦 Стоимость упаковки: ${totalPackagingCost} ₽\n\n` +
    `*ИТОГО: ${totalCost} ₽*`;

  const inline_keyboard = [
    [{ text: "✅ Подтвердить заказ", callback_data: "confirm:yes" }],
    [{ text: "❌ Отменить", callback_data: "confirm:no" }],
  ];

  await sendMessage(chatId, confirmText, { inline_keyboard });
}

// ─────────────────────────────────────────────
//  Создание и отправка заказа
// ─────────────────────────────────────────────

async function createAndSendOrder(chatId: number, userId: string, state: BotState): Promise<void> {
  if (!state.items?.length || !state.regionId || !state.decorId) return;

  const [region] = await db.select().from(regionsTable).where(eq(regionsTable.id, state.regionId));
  const [decor] = await db.select().from(decorsTable).where(eq(decorsTable.id, state.decorId));
  const [collection] = decor ? await db.select().from(collectionsTable).where(eq(collectionsTable.id, decor.collectionId)) : [null];
  const [manufacturer] = collection ? await db.select().from(manufacturersTable).where(eq(manufacturersTable.id, collection.manufacturerId)) : [null];

  const { calculated, totalArea, totalFacadesCost, totalHolesCost, totalPackagingCost, totalCost } = calculateItems(
    state.items,
    state.pricePerSqm!,
    state.pricePerHole!,
    state.pricePackagingPerSqm!,
  );

  // Получаем реквизиты для счёта
  const settingsRows = await db.select().from(invoiceSettingsTable).limit(1);
  const settings: InvoiceSettingsData = settingsRows[0] ?? {
    supplierName: "", supplierInn: "", supplierKpp: "", supplierAddress: "",
    supplierPhone: "", supplierEmail: "", bankName: "", bankAccount: "",
    bankBic: "", bankCorrespondentAccount: "", invoicePrefix: "СЧ-",
  };

  const [order] = await db.insert(ordersTable).values({
    regionId: state.regionId,
    decorId: state.decorId,
    customerName: state.customerName!,
    customerContact: state.customerContact!,
    totalArea: String(totalArea),
    totalFacadesCost: String(totalFacadesCost),
    totalHolesCost: String(totalHolesCost),
    totalPackagingCost: String(totalPackagingCost),
    totalCost: String(totalCost),
    attachedFileUrl: state.attachedFileUrl ?? null,
    status: "new",
  }).returning();

  // Генерируем номер счёта и сохраняем
  const invoiceNumber = buildInvoiceNumber(settings.invoicePrefix, order.id, order.createdAt);
  await db.update(ordersTable).set({ invoiceNumber }).where(eq(ordersTable.id, order.id));

  const itemValues = calculated.map((item) => ({
    orderId: order.id,
    rowNumber: item.rowNumber,
    height: String(item.height),
    width: String(item.width),
    quantity: item.quantity,
    holes: item.holes,
    area: String(item.area),
    facadesCost: String(item.facadesCost),
    holesCost: String(item.holesCost),
    packagingCost: String(item.packagingCost),
  }));
  await db.insert(orderItemsTable).values(itemValues);

  // Генерируем Excel-бланк
  const excelBuffer = generateOrderExcel({
    orderId: order.id,
    customerName: state.customerName!,
    customerContact: state.customerContact!,
    regionName: region?.name ?? "—",
    manufacturerName: manufacturer?.name ?? "—",
    collectionName: collection?.name ?? "—",
    decorName: decor?.name ?? "—",
    items: calculated,
    totalArea,
    totalFacadesCost,
    totalHolesCost,
    totalPackagingCost,
    totalCost,
    createdAt: order.createdAt,
  });

  // Отправляем Excel-бланк клиенту
  await sendDocumentBuffer(chatId, excelBuffer, `order_${order.id}.xlsx`, `📎 Бланк заказа #${order.id}`);

  // Генерируем счёт и отправляем клиенту
  const invoiceExcelBuffer = generateInvoiceExcel({
    invoiceNumber,
    invoiceDate: order.createdAt,
    settings,
    customerName: state.customerName!,
    customerContact: state.customerContact!,
    decorName: decor?.name ?? "—",
    collectionName: collection?.name ?? "—",
    manufacturerName: manufacturer?.name ?? "—",
    pricePerSqm: state.pricePerSqm ?? 0,
    items: calculated,
    totalFacadesCost,
    totalHolesCost,
    totalPackagingCost,
    totalCost,
  });
  await sendDocumentBuffer(chatId, invoiceExcelBuffer, `invoice_${invoiceNumber}.xlsx`, `🧾 Счёт на оплату № ${invoiceNumber}`);

  // Скачиваем файл присадки (если был прикреплён) для вложения в email
  const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const emailAttachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
    { filename: `order_${order.id}.xlsx`, content: excelBuffer, contentType: xlsx },
    { filename: `invoice_${invoiceNumber}.xlsx`, content: invoiceExcelBuffer, contentType: xlsx },
  ];

  if (state.attachedFileUrl && state.attachedFileName) {
    const fileBuffer = await downloadTelegramFile(state.attachedFileUrl);
    if (fileBuffer) {
      const ext = state.attachedFileName.split(".").pop() ?? "bin";
      const mime = getMimeType(ext);
      emailAttachments.push({ filename: state.attachedFileName, content: fileBuffer, contentType: mime });
    }
  }

  // Отправляем письмо менеджеру региона
  if (region) {
    const emailHtml = buildOrderEmailHtml({
      orderId: order.id,
      customerName: state.customerName!,
      customerContact: state.customerContact!,
      regionName: region.name,
      manufacturerName: manufacturer?.name ?? "—",
      collectionName: collection?.name ?? "—",
      decorName: decor?.name ?? "—",
      totalArea,
      totalFacadesCost,
      totalHolesCost,
      totalPackagingCost,
      totalCost,
      itemsCount: state.items.length,
      createdAt: order.createdAt,
    });

    await sendOrderEmail({
      to: region.managerEmail,
      subject: `Новый заказ фасадов #${order.id} — ${state.customerName}`,
      html: emailHtml,
      attachments: emailAttachments,
    });
  }

  sessions.delete(userId);

  const fileNote = state.attachedFileName
    ? `\n📎 Файл присадки *«${state.attachedFileName}»* приложен.`
    : "";

  await sendMessage(
    chatId,
    `✅ *Заказ #${order.id} оформлен!*\n\n` +
    `Итоговая стоимость: *${totalCost} ₽*\n\n` +
    `Выше отправлены два документа:\n` +
    `📄 Бланк-заказ\n` +
    `🧾 Счёт на оплату № ${invoiceNumber}${fileNote}\n\n` +
    `Менеджер получил уведомление по email и свяжется с вами.\n\n` +
    `Для нового заказа введите /start`
  );
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    dxf: "application/dxf",
    dwg: "application/acad",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    zip: "application/zip",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
