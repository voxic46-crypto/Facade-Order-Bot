import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Bot, Globe, RefreshCw } from "lucide-react";

export default function BotSettings() {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<Record<string, unknown> | null>(null);
  const [setResult, setSetResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSetWebhook = async () => {
    if (!webhookUrl) return;
    setIsSettingWebhook(true);
    setSetResult(null);
    try {
      const res = await fetch("/api/bot/set-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setSetResult({ success: true, message: "Вебхук успешно зарегистрирован!" });
        toast({ title: "Вебхук установлен" });
      } else {
        setSetResult({ success: false, message: data.description || "Ошибка при установке вебхука" });
      }
    } catch {
      setSetResult({ success: false, message: "Сетевая ошибка" });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleCheckWebhook = async () => {
    setIsCheckingWebhook(true);
    setWebhookInfo(null);
    try {
      const res = await fetch("/api/bot/webhook-info");
      const data = await res.json();
      setWebhookInfo(data);
    } catch {
      toast({ title: "Не удалось получить информацию о вебхуке", variant: "destructive" });
    } finally {
      setIsCheckingWebhook(false);
    }
  };

  const info = webhookInfo?.result as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки Telegram-бота</h1>
        <p className="text-muted-foreground mt-1">Подключение и управление Telegram-ботом для приёма заказов.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot size={18} /> Шаг 1 — Создайте бота
            </CardTitle>
            <CardDescription>Получите токен у @BotFather в Telegram</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
              <li>Откройте Telegram и найдите <strong>@BotFather</strong></li>
              <li>Отправьте команду <code className="bg-slate-100 px-1 rounded">/newbot</code></li>
              <li>Введите название и имя бота (должно заканчиваться на <em>bot</em>)</li>
              <li>Скопируйте полученный <strong>токен</strong></li>
              <li>Установите его как переменную окружения <code className="bg-slate-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code> на сервере</li>
            </ol>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Важно</AlertTitle>
              <AlertDescription>
                Токен нужно прописать в <code>.env</code> на сервере — не здесь, в целях безопасности.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={18} /> Шаг 2 — Зарегистрируйте вебхук
            </CardTitle>
            <CardDescription>Сообщите Telegram, куда отправлять обновления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL вебхука</Label>
              <Input
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://ваш-домен.ru/api/bot/webhook"
              />
              <p className="text-xs text-muted-foreground">
                Должен быть HTTPS. На сервере это будет URL вашего API + <code>/api/bot/webhook</code>
              </p>
            </div>
            <Button
              onClick={handleSetWebhook}
              disabled={!webhookUrl || isSettingWebhook}
              className="w-full"
            >
              {isSettingWebhook ? "Регистрируем..." : "Зарегистрировать вебхук"}
            </Button>

            {setResult && (
              <Alert variant={setResult.success ? "default" : "destructive"}>
                {setResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{setResult.success ? "Успешно" : "Ошибка"}</AlertTitle>
                <AlertDescription>{setResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw size={18} /> Статус вебхука
            </CardTitle>
            <CardDescription>Проверьте, что Telegram правильно подключён</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleCheckWebhook} disabled={isCheckingWebhook}>
              {isCheckingWebhook ? "Проверяем..." : "Проверить статус"}
            </Button>

            {info && (
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div className="flex gap-3">
                  <span className="text-muted-foreground w-40">URL вебхука:</span>
                  <span className="font-medium break-all">{String(info.url || "—")}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-muted-foreground w-40">Ожидающих обновлений:</span>
                  <span className="font-medium">{String(info.pending_update_count ?? 0)}</span>
                </div>
                {info.last_error_message && (
                  <div className="flex gap-3">
                    <span className="text-muted-foreground w-40">Последняя ошибка:</span>
                    <span className="font-medium text-destructive">{String(info.last_error_message)}</span>
                  </div>
                )}
                {info.url && !info.last_error_message && (
                  <Alert className="mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Бот подключён</AlertTitle>
                    <AlertDescription>Вебхук активен и ошибок нет.</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Как работает бот</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-center">
              {[
                { step: "1", label: "/start", desc: "Клиент запускает бота" },
                { step: "2", label: "Выбор", desc: "Регион → Производитель → Коллекция → Декор" },
                { step: "3", label: "Позиции", desc: "Вводит размеры: высота ширина кол-во отверстия" },
                { step: "4", label: "Заказ", desc: "Получает Excel-файл, менеджеру уходит письмо" },
              ].map(item => (
                <div key={item.step} className="rounded-lg border p-3 space-y-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mx-auto">{item.step}</div>
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-muted-foreground text-xs">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
