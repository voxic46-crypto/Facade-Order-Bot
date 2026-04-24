import { Link, useLocation } from "wouter";
import { LayoutDashboard, Map, ListTree, Banknote, Upload, ShoppingCart, Bot, FileText, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/regions", label: "Регионы", icon: Map },
  { href: "/catalog", label: "Каталог", icon: ListTree },
  { href: "/prices", label: "Прайс", icon: Banknote },
  { href: "/import", label: "Импорт", icon: Upload },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/invoice-settings", label: "Реквизиты", icon: FileText },
  { href: "/bot", label: "Telegram-бот", icon: Bot },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col border-r border-slate-800 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">FacadeBot</span>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold uppercase">
              {(username ?? "A").charAt(0)}
            </div>
            <div className="text-sm flex-1 min-w-0">
              <div className="font-medium truncate">{username ?? "Администратор"}</div>
              <div className="text-xs text-slate-400">Панель управления</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800 px-3"
          >
            <LogOut size={15} />
            Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
