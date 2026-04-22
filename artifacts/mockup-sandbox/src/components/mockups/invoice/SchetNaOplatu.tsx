export function SchetNaOplatu() {
  const PRICE_PER_SQM = 12500;
  const PRICE_PER_HOLE = 90;
  const PRICE_PACKAGING_PER_SQM = 350;

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
    customer: { name: "Иванов Иван Иванович", contact: "+7 (916) 987-65-43" },
  };

  // Фасады — каждый станет отдельной строкой счёта
  const facades = [
    { height: 716, width: 396, qty: 2, holes: 4 },
    { height: 716, width: 596, qty: 4, holes: 8 },
    { height: 916, width: 396, qty: 2, holes: 4 },
    { height: 496, width: 296, qty: 3, holes: 6 },
  ];

  // Рассчитываем каждую позицию фасада
  const facadeItems = facades.map((f, i) => {
    const areaPerPiece = parseFloat(((f.height / 1000) * (f.width / 1000)).toFixed(4));
    const totalArea    = Math.round(areaPerPiece * f.qty * 10000) / 10000;
    const total        = Math.round(totalArea * PRICE_PER_SQM * 100) / 100;
    return { n: i + 1, ...f, areaPerPiece, totalArea, total };
  });

  // Итого по фасадам
  const sumFacades   = facadeItems.reduce((s, i) => s + i.total, 0);
  const totalArea    = Math.round(facadeItems.reduce((s, i) => s + i.totalArea, 0) * 10000) / 10000;

  // Присадка: суммарное кол-во отверстий = Σ(holes × qty)
  const totalHoles   = facadeItems.reduce((s, i) => s + i.holes * i.qty, 0);
  const sumHoles     = Math.round(totalHoles * PRICE_PER_HOLE * 100) / 100;

  // Упаковка: суммарный м² фасадов × цена за м²
  const sumPacking   = Math.round(totalArea * PRICE_PACKAGING_PER_SQM * 100) / 100;

  const grandTotal   = sumFacades + sumHoles + sumPacking;
  const allCount     = facadeItems.length + 2; // + присадка + упаковка

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtA = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-[840px] bg-white shadow-lg">

        {/* ── Банковские реквизиты ───────────────────────── */}
        <div className="border-2 border-gray-800 p-3">
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="w-[56%] pr-3 align-top border-r border-gray-400 pb-1">
                  <div className="text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Банк получателя</div>
                  <div className="font-bold text-[12px]">{invoice.bank.name}</div>
                </td>
                <td className="pl-3 align-top pb-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">БИК</span>
                    <span className="font-mono font-bold">{invoice.bank.bic}</span>
                  </div>
                  <div className="flex justify-between gap-2 mt-0.5">
                    <span className="text-gray-500 shrink-0">Корр. сч. №</span>
                    <span className="font-mono font-bold text-[10px]">{invoice.bank.corrAccount}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-t border-gray-400">
                <td className="pr-3 border-r border-gray-400 align-top pt-1">
                  <div className="text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Получатель</div>
                  <div className="font-bold">{invoice.supplier.name}</div>
                  <div className="text-gray-500 text-[10px] mt-0.5">
                    ИНН {invoice.supplier.inn} / КПП {invoice.supplier.kpp}
                  </div>
                </td>
                <td className="pl-3 align-top pt-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Расч. сч. №</span>
                    <span className="font-mono font-bold text-[10px]">{invoice.bank.account}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Заголовок ──────────────────────────────────── */}
        <div className="px-4 pt-4 pb-1">
          <div className="text-[17px] font-bold text-gray-900 leading-tight">
            Счёт на оплату № {invoice.number} от {invoice.date}
          </div>
          <div className="h-[2.5px] bg-gray-900 mt-2" />
          <div className="h-[1px] bg-gray-900 mt-[3px]" />
        </div>

        {/* ── Стороны ────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-3 text-[11px] space-y-1.5">
          <div className="flex gap-1">
            <span className="text-gray-500 w-24 shrink-0">Поставщик:</span>
            <span>
              <span className="font-semibold">{invoice.supplier.name}</span>
              <span className="text-gray-500">, ИНН {invoice.supplier.inn} / КПП {invoice.supplier.kpp}, {invoice.supplier.address}</span>
            </span>
          </div>
          <div className="flex gap-1">
            <span className="text-gray-500 w-24 shrink-0" />
            <span className="text-gray-600">{invoice.supplier.phone}&nbsp;&nbsp;{invoice.supplier.email}</span>
          </div>
          <div className="flex gap-1 mt-1">
            <span className="text-gray-500 w-24 shrink-0">Покупатель:</span>
            <span className="font-semibold">{invoice.customer.name}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-gray-500 w-24 shrink-0">Контакт:</span>
            <span>{invoice.customer.contact}</span>
          </div>
        </div>

        {/* ── Таблица ────────────────────────────────────── */}
        <div className="px-4 pb-0">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-1.5 py-1.5 text-center w-7 font-semibold text-gray-700">№</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold text-gray-700">Наименование товара / услуги</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right w-[90px] font-semibold text-gray-700">Кол-во</th>
                <th className="border border-gray-400 px-1.5 py-1.5 text-center w-12 font-semibold text-gray-700">Ед.</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right w-[100px] font-semibold text-gray-700">Цена, ₽</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right w-[100px] font-semibold text-gray-700">Сумма, ₽</th>
              </tr>
            </thead>
            <tbody>

              {/* ─ Фасады ─ */}
              {facadeItems.map((item) => (
                <tr key={item.n} className="even:bg-gray-50/40">
                  <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-400">{item.n}</td>
                  <td className="border border-gray-300 px-2 py-2">
                    <div className="font-medium">Фасад МДФ Kronospan / Trend / Дуб Сонома</div>
                    <div className="text-gray-500 text-[9.5px] mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-gray-700">{item.height}×{item.width} мм</span>
                      <span className="text-gray-300">·</span>
                      <span>{item.qty} шт.</span>
                      <span className="text-gray-300">·</span>
                      <span>{item.areaPerPiece.toFixed(4).replace(".", ",")} м² / шт.</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                    {fmtA(item.totalArea)}
                  </td>
                  <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-500">м²</td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-mono">
                    {fmt(PRICE_PER_SQM)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                    {fmt(item.total)}
                  </td>
                </tr>
              ))}

              {/* ─ Присадка: кол-во отверстий × цена за отверстие ─ */}
              <tr className="bg-amber-50/40">
                <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-400">
                  {facadeItems.length + 1}
                </td>
                <td className="border border-gray-300 px-2 py-2">
                  <div className="font-medium text-gray-800">Работа по присадке (сверление отверстий под петли)</div>
                  <div className="text-gray-500 text-[9.5px] mt-0.5">
                    По фасадам: {facades.map(f => `${f.holes} отв. × ${f.qty} шт.`).join(" + ")} = {totalHoles} отв. итого
                  </div>
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                  {totalHoles}
                </td>
                <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-500">отв.</td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono">
                  {fmt(PRICE_PER_HOLE)}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                  {fmt(sumHoles)}
                </td>
              </tr>

              {/* ─ Упаковка: суммарный м² фасадов × цена за м² ─ */}
              <tr className="bg-blue-50/30">
                <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-400">
                  {facadeItems.length + 2}
                </td>
                <td className="border border-gray-300 px-2 py-2">
                  <div className="font-medium text-gray-800">Упаковка</div>
                  <div className="text-gray-500 text-[9.5px] mt-0.5">
                    Суммарная площадь фасадов: {fmtA(totalArea)} м²
                  </div>
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                  {fmtA(totalArea)}
                </td>
                <td className="border border-gray-300 px-1.5 py-2 text-center text-gray-500">м²</td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono">
                  {fmt(PRICE_PACKAGING_PER_SQM)}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right font-mono font-semibold">
                  {fmt(sumPacking)}
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* ── Итого ──────────────────────────────────────── */}
        <div className="px-4 pb-3">
          <table className="w-full text-[10.5px]">
            <tbody>
              <tr>
                <td className="border-l border-r border-gray-300 px-2 py-1.5 text-left text-gray-400 italic">
                  Без налога (НДС)
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right w-[100px] text-gray-400 italic">—</td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-2 py-2 text-right font-bold text-[12px] bg-gray-50">
                  ИТОГО:
                </td>
                <td className="border border-gray-400 px-2 py-2 text-right font-bold font-mono text-[13px] text-gray-900 w-[100px] bg-gray-50">
                  {fmt(grandTotal)} ₽
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Сумма прописью ─────────────────────────────── */}
        <div className="px-4 pb-4 text-[10.5px]">
          <div className="bg-gray-50 border border-gray-200 px-3 py-2">
            <span className="text-gray-500">Итого {allCount} наименования, на сумму </span>
            <span className="font-bold">{fmt(grandTotal)} руб.</span>
            <br />
            <span className="text-gray-500 italic">{grandTotal.toLocaleString("ru-RU")} рублей 00 копеек. Без НДС.</span>
          </div>
        </div>

        {/* ── Подписи ────────────────────────────────────── */}
        <div className="px-4 pb-6 text-[10.5px] border-t border-gray-200 pt-4 space-y-4">
          {["Руководитель", "Бухгалтер"].map((role) => (
            <div key={role} className="flex items-end gap-3">
              <span className="text-gray-700 w-28 shrink-0">{role}</span>
              <div className="flex-1 border-b border-gray-400" />
              <span className="text-gray-400 px-1">/</span>
              <div className="flex-1 border-b border-gray-400" />
              <span className="text-gray-400 text-[9px] whitespace-nowrap">(подпись / расшифровка)</span>
            </div>
          ))}
        </div>

        <div className="px-4 pb-3 text-center text-[9px] text-gray-300">
          Счёт сформирован автоматически · FacadeBot · {invoice.date}
        </div>
      </div>
    </div>
  );
}
