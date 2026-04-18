import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Building2, Landmark, Save, FileText } from "lucide-react";

interface InvoiceSettingsData {
  id?: number;
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

const EMPTY: InvoiceSettingsData = {
  supplierName: "",
  supplierInn: "",
  supplierKpp: "",
  supplierAddress: "",
  supplierPhone: "",
  supplierEmail: "",
  bankName: "",
  bankAccount: "",
  bankBic: "",
  bankCorrespondentAccount: "",
  invoicePrefix: "СЧ-",
};

export default function InvoiceSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState<InvoiceSettingsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/invoice-settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          id: data.id,
          supplierName: data.supplierName ?? "",
          supplierInn: data.supplierInn ?? "",
          supplierKpp: data.supplierKpp ?? "",
          supplierAddress: data.supplierAddress ?? "",
          supplierPhone: data.supplierPhone ?? "",
          supplierEmail: data.supplierEmail ?? "",
          bankName: data.bankName ?? "",
          bankAccount: data.bankAccount ?? "",
          bankBic: data.bankBic ?? "",
          bankCorrespondentAccount: data.bankCorrespondentAccount ?? "",
          invoicePrefix: data.invoicePrefix ?? "СЧ-",
        });
      })
      .catch(() => toast({ title: "Не удалось загрузить реквизиты", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof InvoiceSettingsData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoice-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Реквизиты сохранены" });
    } catch {
      toast({ title: "Ошибка при сохранении", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="text-blue-600" size={28} />
          <h1 className="text-3xl font-bold tracking-tight">Реквизиты для счёта</h1>
        </div>
        <p className="text-muted-foreground">
          Заполните реквизиты компании и банка. Они будут автоматически подставляться в каждый счёт на оплату.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Данные компании */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-muted-foreground" />
              <CardTitle>Данные компании</CardTitle>
            </div>
            <CardDescription>Реквизиты поставщика, которые попадут в шапку счёта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Наименование организации</Label>
              <Input value={form.supplierName} onChange={set("supplierName")} placeholder='ООО "Ваша Компания"' />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input value={form.supplierInn} onChange={set("supplierInn")} placeholder="7700000000" />
              </div>
              <div className="space-y-2">
                <Label>КПП</Label>
                <Input value={form.supplierKpp} onChange={set("supplierKpp")} placeholder="770000000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Юридический адрес</Label>
              <Input value={form.supplierAddress} onChange={set("supplierAddress")} placeholder="г. Москва, ул. Примерная, д. 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={form.supplierPhone} onChange={set("supplierPhone")} placeholder="+7 (495) 000-00-00" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.supplierEmail} onChange={set("supplierEmail")} placeholder="info@company.ru" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Банковские реквизиты */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark size={20} className="text-muted-foreground" />
              <CardTitle>Банковские реквизиты</CardTitle>
            </div>
            <CardDescription>Данные банка — отображаются в шапке счёта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Наименование банка</Label>
              <Input value={form.bankName} onChange={set("bankName")} placeholder='АО "АЛЬФА-БАНК"' />
            </div>
            <div className="space-y-2">
              <Label>Расчётный счёт</Label>
              <Input value={form.bankAccount} onChange={set("bankAccount")} placeholder="40702810000000000000" maxLength={20} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>БИК</Label>
                <Input value={form.bankBic} onChange={set("bankBic")} placeholder="044525593" maxLength={9} />
              </div>
              <div className="space-y-2">
                <Label>Корреспондентский счёт</Label>
                <Input value={form.bankCorrespondentAccount} onChange={set("bankCorrespondentAccount")} placeholder="30101810200000000593" maxLength={20} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Префикс нумерации счетов</Label>
              <div className="flex gap-2 items-center">
                <Input value={form.invoicePrefix} onChange={set("invoicePrefix")} placeholder="СЧ-" className="w-32" />
                <span className="text-sm text-muted-foreground">Пример: <strong>{form.invoicePrefix || "СЧ-"}2024-42</strong></span>
              </div>
              <p className="text-xs text-muted-foreground">Номер счёта формируется как: Префикс + Год + Номер заказа</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-40">
          <Save size={16} />
          {saving ? "Сохранение..." : "Сохранить реквизиты"}
        </Button>
      </div>
    </div>
  );
}
