export function SchetNaOplatu() {
  const invoice = {
    number: "СЧ-2025-42",
    date: "18 апреля 2025 г.",
    supplier: {
      name: 'ООО "ФасадПроф"',
      inn: "7712345678",
      kpp: "771201001",
      address: "г. Москва, ул. Производственная, д. 12, офис 301",
      phone: "+7 (495) 123-45-67",
      email: "info@fasadprof.ru",
    },
    bank: {
      name: "ПАО Сбербанк",
      bic: "044525225",
      account: "40702810938000012345",
      corrAccount: "30101810400000000225",
    },
    customer: {
      name: "Иванов Иван Иванович",
      contact: "+7 (916) 987-65-43",
    },
    items: [
      {
        n: 1,
        name: "Фасады МДФ Kronospan / Trend / Дуб Сонома",
        qty: 1,
        unit: "компл.",
        price: 47800,
        total: 47800,
      },
      {
        n: 2,
        name: "Работа по присадке (сверление отверстий под петли)",
        qty: 1,
        unit: "компл.",
        price: 3600,
        total: 3600,
      },
      {
        n: 3,
        name: "Упаковка",
        qty: 1,
        unit: "компл.",
        price: 1200,
        total: 1200,
      },
    ],
    total: 52600,
    totalWords: "Пятьдесят две тысячи шестьсот рублей 00 коп.",
  };

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-[780px] bg-white shadow-lg">

        {/* ── Банковские реквизиты (шапка) ─────────────── */}
        <div className="border-2 border-gray-800 p-3 mb-0">
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="w-[56%] pr-3 align-top border-r border-gray-400 pb-1">
                  <div className="text-gray-500 text-[10px] mb-0.5">Банк получателя</div>
                  <div className="font-bold text-[12px]">{invoice.bank.name}</div>
                </td>
                <td className="pl-3 align-top pb-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">БИК</span>
                    <span className="font-mono font-bold">{invoice.bank.bic}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-500">Сч. №</span>
                    <span className="font-mono font-bold tracking-wider">{invoice.bank.corrAccount}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-t border-gray-400">
                <td className="pr-3 border-r border-gray-400 align-top pt-1">
                  <div className="text-gray-500 text-[10px] mb-0.5">Получатель</div>
                  <div className="font-bold">{invoice.supplier.name}</div>
                  <div className="text-gray-600 text-[10px] mt-0.5">
                    ИНН {invoice.supplier.inn} / КПП {invoice.supplier.kpp}
                  </div>
                </td>
                <td className="pl-3 align-top pt-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Сч. №</span>
                    <span className="font-mono font-bold tracking-wider text-[10px]">{invoice.bank.account}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Заголовок счёта ───────────────────────────── */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[17px] font-bold text-gray-900">
            Счёт на оплату № {invoice.number} от {invoice.date}
          </div>
          <div className="h-[2px] bg-gray-900 mt-2 mb-0" />
          <div className="h-[1px] bg-gray-900 mt-[3px]" />
        </div>

        {/* ── Поставщик / Покупатель ────────────────────── */}
        <div className="px-3 pt-2 pb-3 text-[11px] space-y-1">
          <div className="flex gap-1">
            <span className="text-gray-500 w-24 shrink-0">Поставщик:</span>
            <span className="font-semibold">
              {invoice.supplier.name},{" "}
              <span className="font-normal text-gray-600">
                ИНН {invoice.supplier.inn} / КПП {invoice.supplier.kpp}, {invoice.supplier.address}
              </span>
            </span>
          </div>
          {invoice.supplier.phone && (
            <div className="flex gap-1">
              <span className="text-gray-500 w-24 shrink-0">Тел.:</span>
              <span>{invoice.supplier.phone}</span>
              {invoice.supplier.email && (
                <span className="ml-4 text-blue-700">{invoice.supplier.email}</span>
              )}
            </div>
          )}
          <div className="flex gap-1 mt-2">
            <span className="text-gray-500 w-24 shrink-0">Покупатель:</span>
            <span className="font-semibold">{invoice.customer.name}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-gray-500 w-24 shrink-0">Контакт:</span>
            <span>{invoice.customer.contact}</span>
          </div>
        </div>

        {/* ── Таблица позиций ───────────────────────────── */}
        <div className="px-3 pb-0">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 px-1.5 py-1.5 text-center w-8 font-semibold text-gray-700">
                  №
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold text-gray-700">
                  Наименование товара / услуги
                </th>
                <th className="border border-gray-400 px-1.5 py-1.5 text-center w-14 font-semibold text-gray-700">
                  Кол-во
                </th>
                <th className="border border-gray-400 px-1.5 py-1.5 text-center w-12 font-semibold text-gray-700">
                  Ед.
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-right w-24 font-semibold text-gray-700">
                  Цена, ₽
                </th>
                <th className="border border-gray-400 px-2 py-1.5 text-right w-24 font-semibold text-gray-700">
                  Сумма, ₽
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.n} className="even:bg-gray-50/50">
                  <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-500">
                    {item.n}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">{item.name}</td>
                  <td className="border border-gray-300 px-1.5 py-2 text-center">{item.qty}</td>
                  <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-600">
                    {item.unit}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-mono">
                    {fmt(item.price)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                    {fmt(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Итого ─────────────────────────────────────── */}
        <div className="px-3 pb-3">
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="border-l border-r border-gray-300 px-2 py-1.5 text-left text-gray-500 italic">
                  Без налога (НДС)
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right w-24 text-gray-500 italic">
                  —
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 px-2 py-2 text-right font-bold text-[12px]">
                  ИТОГО:
                </td>
                <td className="border border-gray-400 px-2 py-2 text-right font-bold font-mono text-[13px] text-gray-900 w-24">
                  {fmt(invoice.total)} ₽
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Сумма прописью ────────────────────────────── */}
        <div className="px-3 pb-4 text-[11px]">
          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
            <span className="text-gray-500">Итого {invoice.items.length} наименования на сумму </span>
            <span className="font-bold">{fmt(invoice.total)} руб.</span>
            <br />
            <span className="text-gray-600 italic">{invoice.totalWords}</span>
          </div>
        </div>

        {/* ── Подписи ───────────────────────────────────── */}
        <div className="px-3 pb-6 text-[11px] space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-end gap-4">
            <span className="text-gray-700 w-28 shrink-0">Руководитель</span>
            <div className="flex-1 border-b border-gray-400 pb-0.5 min-w-[120px]" />
            <span className="text-gray-400 mx-2">/</span>
            <div className="flex-1 border-b border-gray-400 pb-0.5 min-w-[160px]" />
            <span className="text-gray-400 text-[10px] ml-2">(подпись / расшифровка)</span>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-gray-700 w-28 shrink-0">Бухгалтер</span>
            <div className="flex-1 border-b border-gray-400 pb-0.5 min-w-[120px]" />
            <span className="text-gray-400 mx-2">/</span>
            <div className="flex-1 border-b border-gray-400 pb-0.5 min-w-[160px]" />
            <span className="text-gray-400 text-[10px] ml-2">(подпись / расшифровка)</span>
          </div>
        </div>

        {/* ── Пометка Excel ─────────────────────────────── */}
        <div className="px-3 pb-3">
          <div className="text-[9px] text-gray-400 text-center">
            Счёт формируется автоматически ботом FacadeBot и отправляется клиенту в Telegram
            и на email менеджера в формате .xlsx
          </div>
        </div>
      </div>
    </div>
  );
}
