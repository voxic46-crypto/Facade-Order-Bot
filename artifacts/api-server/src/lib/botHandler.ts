import { db, regionsTable, manufacturersTable, collectionsTable, decorsTable, pricesTable, ordersTable, orderItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { calculateItems, generateOrderExcel, buildOrderEmailHtml } from "./orderUtils";
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

async function sendDocument(chatId: number, buffer: Buffer, filename: string, caption?: string): Promise<void> {
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
};

const sessions = new Map<string, BotState>();

export async function handleBotUpdate(update: Record<string, unknown>): Promise<void> {
  // Handle callback_query (button presses)
  if (update.callback_query) {
    const cb = update.callback_query as Record<string, unknown>;
    const cbMessage = cb.message as Record<string, unknown> | undefined;
    const from = cb.from as Record<string, unknown> | undefined;
    const chatId = (cbMessage?.chat as Record<string, unknown> | undefined)?.id as number | undefined;
    const userId = String(from?.id ?? "");
    const data = String(cb.data ?? "").trim();

    if (!chatId || !userId) return;

    await answerCallbackQuery(String(cb.id));

    let state = sessions.get(userId) ?? { step: "start" };
    await processStep(userId, chatId, data, state);
    return;
  }

  // Handle regular messages
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return;

  const from = message.from as Record<string, unknown> | undefined;
  const chat = message.chat as Record<string, unknown> | undefined;
  const chatId = chat?.id as number | undefined;
  const userId = String(from?.id ?? "");
  const text = String((message.text as string | undefined) ?? "").trim();

  if (!chatId || !userId) return;

  let state = sessions.get(userId) ?? { step: "start" };

  if (text === "/start") {
    state = { step: "select_region" };
    sessions.set(userId, state);
    await sendSelectRegion(chatId);
    return;
  }

  await processStep(userId, chatId, text, state);
}

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
    await sendMessage(chatId, "Нет декоров с прайсом для вашего региона в этой коллекции. Попробуйте другую коллекцию или обратитесь к менеджеру.");
    return;
  }

  const inline_keyboard = available.map((d) => [{ text: d.name, callback_data: `d:${d.id}` }]);
  await sendMessage(chatId, "Выберите декор:", { inline_keyboard });
}

async function processStep(userId: string, chatId: number, text: string, state: BotState): Promise<void> {

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
        await sendMessage(chatId, `Для декора "${decor.name}" в вашем регионе нет прайса. Выберите другой декор.`);
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
      `Высота и ширина в мм, отверстия — общее количество на все фасады позиции.\n\n` +
      `Когда введёте все позиции — отправьте *готово*`
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
      state.step = "confirm";
      sessions.set(userId, state);
      await sendOrderConfirmation(chatId, state);
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
        `Введите следующую позицию или отправьте *готово*`
      );
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

  const confirmText =
    `📋 *Подтверждение заказа*\n\n` +
    `🗺 Регион: ${state.regionName}\n` +
    `🏭 Производитель: ${state.manufacturerName}\n` +
    `📦 Коллекция: ${state.collectionName}\n` +
    `🎨 Декор: ${state.decorName}\n` +
    `👤 Клиент: ${state.customerName}\n` +
    `📞 Контакт: ${state.customerContact}\n\n` +
    `*Позиции:*\n${itemsText}\n` +
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
    attachedFileUrl: null,
    status: "new",
  }).returning();

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

  // Отправить Excel клиенту в чат
  await sendDocument(
    chatId,
    excelBuffer,
    `order_${order.id}.xlsx`,
    `📎 Бланк заказа #${order.id}`
  );

  // Отправить письмо менеджеру региона
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
      attachments: [{
        filename: `order_${order.id}.xlsx`,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }],
    });
  }

  sessions.delete(userId);

  await sendMessage(
    chatId,
    `✅ *Заказ #${order.id} оформлен!*\n\n` +
    `Итоговая стоимость: *${totalCost} ₽*\n\n` +
    `Бланк-заказ в Excel отправлен выше 👆\n` +
    `Менеджер также получил уведомление по email и свяжется с вами.\n\n` +
    `Для нового заказа введите /start`
  );
}
