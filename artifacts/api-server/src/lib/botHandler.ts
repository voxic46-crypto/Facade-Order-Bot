import { db, regionsTable, manufacturersTable, collectionsTable, decorsTable, pricesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { calculateItems, generateOrderExcel, buildOrderEmailHtml } from "./orderUtils";
import { sendOrderEmail } from "./email";
import { ordersTable, orderItemsTable } from "@workspace/db";

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN ?? "";
const MAX_API_URL = "https://botapi.max.ru";

async function sendMessage(chatId: string | number, text: string, keyboard?: object): Promise<void> {
  if (!MAX_BOT_TOKEN) {
    logger.warn("MAX_BOT_TOKEN not set, skipping message");
    return;
  }
  const body: Record<string, unknown> = { recipient: { chat_id: chatId }, body: { text } };
  if (keyboard) body.keyboard = keyboard;

  try {
    const resp = await fetch(`${MAX_API_URL}/messages?access_token=${MAX_BOT_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.warn({ status: resp.status, text }, "MAX API error");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send message to MAX");
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
  const updateType = String(update.update_type ?? "");

  if (updateType !== "message_created") return;

  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return;

  const sender = message.sender as Record<string, unknown> | undefined;
  const recipient = message.recipient as Record<string, unknown> | undefined;
  const body = message.body as Record<string, unknown> | undefined;

  if (!sender || !recipient) return;

  const userId = String(sender.user_id ?? "");
  const chatId = String((recipient as Record<string, unknown>).chat_id ?? userId);
  const text = String(body?.text ?? "").trim();

  if (!userId) return;

  let state = sessions.get(userId) ?? { step: "start" };

  if (text === "/start" || text.toLowerCase() === "начать") {
    state = { step: "select_region" };
    sessions.set(userId, state);
    await sendSelectRegion(chatId);
    return;
  }

  await processStep(userId, chatId, text, state);
}

async function sendSelectRegion(chatId: string): Promise<void> {
  const regions = await db.select().from(regionsTable).orderBy(regionsTable.name);
  if (!regions.length) {
    await sendMessage(chatId, "В системе пока нет регионов. Обратитесь к администратору.");
    return;
  }
  const buttons = regions.map((r) => [{ type: "callback", label: r.name, payload: `region:${r.id}:${r.name}` }]);
  await sendMessage(chatId, "Выберите ваш регион:", { buttons });
}

async function processStep(userId: string, chatId: string, text: string, state: BotState): Promise<void> {
  if (state.step === "select_region") {
    if (text.startsWith("region:")) {
      const parts = text.split(":");
      const regionId = parseInt(parts[1], 10);
      const regionName = parts.slice(2).join(":");
      state.regionId = regionId;
      state.regionName = regionName;
      state.step = "select_manufacturer";
      sessions.set(userId, state);
      await sendSelectManufacturer(chatId);
    } else {
      await sendSelectRegion(chatId);
    }
    return;
  }

  if (state.step === "select_manufacturer") {
    if (text.startsWith("manufacturer:")) {
      const parts = text.split(":");
      const manufacturerId = parseInt(parts[1], 10);
      const manufacturerName = parts.slice(2).join(":");
      state.manufacturerId = manufacturerId;
      state.manufacturerName = manufacturerName;
      state.step = "select_collection";
      sessions.set(userId, state);
      await sendSelectCollection(chatId, manufacturerId);
    } else {
      await sendSelectManufacturer(chatId);
    }
    return;
  }

  if (state.step === "select_collection") {
    if (text.startsWith("collection:")) {
      const parts = text.split(":");
      const collectionId = parseInt(parts[1], 10);
      const collectionName = parts.slice(2).join(":");
      state.collectionId = collectionId;
      state.collectionName = collectionName;
      state.step = "select_decor";
      sessions.set(userId, state);
      await sendSelectDecor(chatId, collectionId, state.regionId!);
    } else if (state.manufacturerId) {
      await sendSelectCollection(chatId, state.manufacturerId);
    }
    return;
  }

  if (state.step === "select_decor") {
    if (text.startsWith("decor:")) {
      const parts = text.split(":");
      const decorId = parseInt(parts[1], 10);
      const decorName = parts.slice(2).join(":");

      const [priceRow] = await db.select().from(pricesTable).where(and(eq(pricesTable.regionId, state.regionId!), eq(pricesTable.decorId, decorId)));
      if (!priceRow) {
        await sendMessage(chatId, `Для декора "${decorName}" в вашем регионе нет прайса. Выберите другой декор или обратитесь к менеджеру.`);
        return;
      }

      state.decorId = decorId;
      state.decorName = decorName;
      state.pricePerSqm = parseFloat(priceRow.pricePerSqm);
      state.pricePerHole = parseFloat(priceRow.pricePerHole);
      state.pricePackagingPerSqm = parseFloat(priceRow.pricePackagingPerSqm);
      state.items = [];
      state.step = "enter_customer_name";
      sessions.set(userId, state);
      await sendMessage(chatId, `Отлично! Выбран декор: *${decorName}*\n\nВведите ваше имя и фамилию:`);
    } else if (state.collectionId) {
      await sendSelectDecor(chatId, state.collectionId, state.regionId!);
    }
    return;
  }

  if (state.step === "enter_customer_name") {
    state.customerName = text;
    state.step = "enter_customer_contact";
    sessions.set(userId, state);
    await sendMessage(chatId, "Введите ваш номер телефона или e-mail для связи:");
    return;
  }

  if (state.step === "enter_customer_contact") {
    state.customerContact = text;
    state.items = [];
    state.step = "enter_items";
    sessions.set(userId, state);
    await sendMessage(chatId,
      `Спасибо, ${state.customerName}!\n\nТеперь введите позиции фасадов.\n\nФормат каждой строки:\n*высота ширина кол-во отверстий*\n\nПример:\n720 596 2 2\n1050 596 4 4\n\nВведите позиции (по одной строке), когда закончите — отправьте команду *готово*`
    );
    return;
  }

  if (state.step === "enter_items") {
    if (text.toLowerCase() === "готово" || text.toLowerCase() === "/готово") {
      if (!state.items || state.items.length === 0) {
        await sendMessage(chatId, "Вы не добавили ни одной позиции. Пожалуйста, введите хотя бы одну позицию в формате:\n*высота ширина кол-во отверстий*");
        return;
      }
      state.step = "confirm";
      sessions.set(userId, state);
      await sendOrderConfirmation(chatId, state);
    } else {
      const parsed = parseItemLine(text);
      if (!parsed) {
        await sendMessage(chatId, `Неверный формат. Введите: *высота ширина количество отверстий*\nПример: *720 596 2 2*`);
        return;
      }
      if (!state.items) state.items = [];
      parsed.rowNumber = state.items.length + 1;
      state.items.push(parsed);
      sessions.set(userId, state);
      await sendMessage(chatId,
        `✅ Позиция ${parsed.rowNumber} добавлена: ${parsed.height}×${parsed.width} мм, ${parsed.quantity} шт., ${parsed.holes} отв.\n\nВведите следующую позицию или отправьте *готово*`
      );
    }
    return;
  }

  if (state.step === "confirm") {
    if (text.toLowerCase() === "подтвердить" || text.toLowerCase() === "confirm" || text.startsWith("confirm:yes")) {
      await createAndSendOrder(chatId, userId, state);
    } else if (text.toLowerCase() === "отмена" || text.toLowerCase() === "cancel" || text.startsWith("confirm:no")) {
      sessions.delete(userId);
      await sendMessage(chatId, "Заказ отменён. Введите /start чтобы начать новый заказ.");
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

async function sendSelectManufacturer(chatId: string): Promise<void> {
  const manufacturers = await db.select().from(manufacturersTable).orderBy(manufacturersTable.name);
  if (!manufacturers.length) {
    await sendMessage(chatId, "В системе нет производителей. Обратитесь к администратору.");
    return;
  }
  const buttons = manufacturers.map((m) => [{ type: "callback", label: m.name, payload: `manufacturer:${m.id}:${m.name}` }]);
  await sendMessage(chatId, "Выберите производителя:", { buttons });
}

async function sendSelectCollection(chatId: string, manufacturerId: number): Promise<void> {
  const collections = await db.select().from(collectionsTable).where(eq(collectionsTable.manufacturerId, manufacturerId)).orderBy(collectionsTable.name);
  if (!collections.length) {
    await sendMessage(chatId, "Нет доступных коллекций для этого производителя.");
    return;
  }
  const buttons = collections.map((c) => [{ type: "callback", label: c.name, payload: `collection:${c.id}:${c.name}` }]);
  await sendMessage(chatId, "Выберите коллекцию:", { buttons });
}

async function sendSelectDecor(chatId: string, collectionId: number, regionId: number): Promise<void> {
  const decors = await db.select().from(decorsTable).where(eq(decorsTable.collectionId, collectionId)).orderBy(decorsTable.name);
  if (!decors.length) {
    await sendMessage(chatId, "Нет доступных декоров для этой коллекции.");
    return;
  }
  const pricesInRegion = await db.select().from(pricesTable).where(eq(pricesTable.regionId, regionId));
  const decorIdsWithPrice = new Set(pricesInRegion.map((p) => p.decorId));
  const available = decors.filter((d) => decorIdsWithPrice.has(d.id));

  if (!available.length) {
    await sendMessage(chatId, "Нет декоров с прайсом для вашего региона в этой коллекции.");
    return;
  }

  const buttons = available.map((d) => [{ type: "callback", label: d.name, payload: `decor:${d.id}:${d.name}` }]);
  await sendMessage(chatId, "Выберите декор:", { buttons });
}

async function sendOrderConfirmation(chatId: string, state: BotState): Promise<void> {
  if (!state.items || !state.pricePerSqm === undefined) return;

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

  const confirmText = `📋 *Подтверждение заказа*\n\n` +
    `Регион: ${state.regionName}\n` +
    `Производитель: ${state.manufacturerName}\n` +
    `Коллекция: ${state.collectionName}\n` +
    `Декор: ${state.decorName}\n` +
    `Клиент: ${state.customerName}\n` +
    `Контакт: ${state.customerContact}\n\n` +
    `*Позиции:*\n${itemsText}\n` +
    `Общая площадь: ${totalArea} м²\n` +
    `Стоимость фасадов: ${totalFacadesCost} ₽\n` +
    `Стоимость отверстий: ${totalHolesCost} ₽\n` +
    `Стоимость упаковки: ${totalPackagingCost} ₽\n` +
    `*ИТОГО: ${totalCost} ₽*\n\n` +
    `Для подтверждения отправьте *подтвердить*, для отмены — *отмена*`;

  const buttons = [
    [{ type: "callback", label: "✅ Подтвердить", payload: "confirm:yes" }],
    [{ type: "callback", label: "❌ Отмена", payload: "confirm:no" }],
  ];

  await sendMessage(chatId, confirmText, { buttons });
}

async function createAndSendOrder(chatId: string, userId: string, state: BotState): Promise<void> {
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
      attachments: [{ filename: `order_${order.id}.xlsx`, content: excelBuffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }],
    });
  }

  sessions.delete(userId);

  await sendMessage(chatId,
    `✅ *Заказ #${order.id} оформлен!*\n\n` +
    `Итоговая стоимость: *${totalCost} ₽*\n\n` +
    `Менеджер получит бланк-заказ по email и свяжется с вами в ближайшее время.\n\n` +
    `Для нового заказа введите /start`
  );
}
