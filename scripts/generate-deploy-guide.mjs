import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  NumberFormat,
  convertInchesToTwip,
  LevelFormat,
} from "docx";
import { writeFileSync } from "fs";

// ─── helpers ────────────────────────────────────────────────────────────────

const CODE_FONT = "Courier New";
const BODY_FONT = "Calibri";
const CODE_BG = "F2F2F2";

const h1 = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
  });

const h2 = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
  });

const h3 = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
  });

const p = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, font: BODY_FONT, size: 22, ...opts })],
    spacing: { before: 80, after: 80 },
  });

const note = (text) =>
  new Paragraph({
    children: [
      new TextRun({
        text: "⚠ " + text,
        font: BODY_FONT,
        size: 22,
        italics: true,
        color: "7B3F00",
      }),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
  });

const tip = (text) =>
  new Paragraph({
    children: [
      new TextRun({
        text: "✓ " + text,
        font: BODY_FONT,
        size: 22,
        italics: true,
        color: "1A5C2A",
      }),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    children: [new TextRun({ text, font: BODY_FONT, size: 22 })],
    bullet: { level },
    spacing: { before: 40, after: 40 },
  });

const numbered = (text, level = 0) =>
  new Paragraph({
    children: [new TextRun({ text, font: BODY_FONT, size: 22 })],
    numbering: { reference: "numbered-list", level },
    spacing: { before: 40, after: 40 },
  });

const code = (text) =>
  new Paragraph({
    children: [new TextRun({ text, font: CODE_FONT, size: 20 })],
    shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
  });

const divider = () =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
    spacing: { before: 200, after: 200 },
  });

const inlineCode = (plain, codeText) =>
  new Paragraph({
    children: [
      new TextRun({ text: plain, font: BODY_FONT, size: 22 }),
      new TextRun({ text: codeText, font: CODE_FONT, size: 20 }),
    ],
    spacing: { before: 40, after: 40 },
  });

function envTable(rows) {
  const headerCells = (texts) =>
    texts.map(
      (t) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: t, font: BODY_FONT, size: 20, bold: true }),
              ],
            }),
          ],
          shading: { type: ShadingType.SOLID, fill: "D9E2F3", color: "D9E2F3" },
        })
    );

  const dataCell = (t, mono = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: t,
              font: mono ? CODE_FONT : BODY_FONT,
              size: mono ? 18 : 20,
            }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headerCells(["Переменная", "Обязательная", "Описание / значение"]),
        tableHeader: true,
      }),
      ...rows.map(
        ([varName, required, desc]) =>
          new TableRow({
            children: [dataCell(varName, true), dataCell(required), dataCell(desc)],
          })
      ),
    ],
  });
}

// ─── document content ────────────────────────────────────────────────────────

const children = [
  // ── TITLE ──
  new Paragraph({
    children: [
      new TextRun({
        text: "FacadeBot — Руководство по развёртыванию",
        font: BODY_FONT,
        size: 40,
        bold: true,
        color: "1F3864",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 160 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Ubuntu 22.04 LTS · Node.js 20 · PostgreSQL 16 · PM2 · Nginx",
        font: BODY_FONT,
        size: 22,
        italics: true,
        color: "595959",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 600 },
  }),

  // ── CONTENTS ──
  h1("Содержание"),
  bullet("1. Требования к серверу"),
  bullet("2. Первоначальная настройка сервера"),
  bullet("3. Установка Node.js, pnpm и PM2"),
  bullet("4. Клонирование проекта"),
  bullet("5. Настройка переменных окружения"),
  bullet("6. База данных PostgreSQL"),
  bullet("7. Сборка и первый запуск (PM2)"),
  bullet("8. Настройка Nginx"),
  bullet("9. Регистрация Telegram-вебхука"),
  bullet("10. Проверка работы"),
  bullet("11. Обновление проекта (Replit → сервер)"),
  bullet("12. Полезные команды"),

  divider(),

  // ── 1. REQUIREMENTS ──
  h1("1. Требования к серверу"),
  p("Минимальные характеристики VPS:"),
  bullet("ОС: Ubuntu 22.04 LTS (рекомендуется)"),
  bullet("CPU: 1 vCPU (2 vCPU рекомендуется)"),
  bullet("RAM: 1 GB (2 GB рекомендуется)"),
  bullet("Диск: 20 GB SSD"),
  bullet("Публичный IP-адрес (статический)"),
  bullet("Домен или IP — для Telegram-вебхука нужен HTTPS"),
  p(""),
  note(
    "Telegram требует HTTPS для вебхука. Используйте бесплатный SSL от Let's Encrypt (certbot), " +
      "либо Cloudflare Tunnel, либо отдельный SSL-сертификат."
  ),

  // ── 2. SERVER SETUP ──
  h1("2. Первоначальная настройка сервера"),
  h2("2.1. Обновление системы"),
  code("sudo apt update && sudo apt upgrade -y"),
  code("sudo apt install -y curl git build-essential software-properties-common"),

  h2("2.2. Создание пользователя (рекомендуется)"),
  p("Работать от root неудобно и небезопасно. Создайте отдельного пользователя:"),
  code("sudo adduser facadebot"),
  code("sudo usermod -aG sudo facadebot"),
  code("su - facadebot"),

  h2("2.3. Настройка файрвола (UFW)"),
  code("sudo ufw allow OpenSSH"),
  code("sudo ufw allow 80/tcp"),
  code("sudo ufw allow 443/tcp"),
  code("sudo ufw enable"),

  // ── 3. NODE / PNPM / PM2 ──
  h1("3. Установка Node.js, pnpm и PM2"),
  h2("3.1. Node.js 20 (через NodeSource)"),
  code("curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"),
  code("sudo apt install -y nodejs"),
  code("node --version   # должно быть v20.x.x"),

  h2("3.2. pnpm"),
  code("npm install -g pnpm"),
  code("pnpm --version"),

  h2("3.3. PM2"),
  code("npm install -g pm2"),
  code("pm2 --version"),
  p("Настройте автозапуск PM2 при перезагрузке сервера:"),
  code("pm2 startup"),
  p("Команда выведет строку с sudo — скопируйте и выполните её. Пример:"),
  code("sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u facadebot --hp /home/facadebot"),

  // ── 4. CLONE ──
  h1("4. Клонирование проекта"),
  p("Склонируйте репозиторий с GitHub (или скопируйте архив):"),
  code("cd ~"),
  code("git clone https://github.com/ВАШ_ЛОГИН/facadebot.git"),
  code("cd facadebot"),
  p(""),
  note(
    "Если репозиторий приватный, используйте SSH-ключ или Personal Access Token. " +
      "Подробнее: https://docs.github.com/en/authentication"
  ),

  h2("4.1. Установка зависимостей"),
  code("pnpm install"),

  // ── 5. ENV VARS ──
  h1("5. Настройка переменных окружения"),
  p(
    "Создайте файл .env в корне проекта. Этот файл не попадает в Git (.gitignore), " +
      "храните его в безопасном месте."
  ),
  code("nano .env"),
  p("Содержимое файла:"),
  code("NODE_ENV=production"),
  code("PORT=8080"),
  code("DATABASE_URL=postgresql://facadebot:ПАРОЛЬ@localhost:5432/facadebot"),
  code("SESSION_SECRET=замените_на_случайную_строку_минимум_40_символов"),
  code("ADMIN_USERNAME=admin"),
  code("ADMIN_PASSWORD=замените_на_надёжный_пароль"),
  code("# COOKIE_SECURE=true  # раскомментируйте только при наличии HTTPS"),
  code("TELEGRAM_BOT_TOKEN=токен_из_BotFather"),
  code("TELEGRAM_WEBHOOK_SECRET=любая_случайная_строка"),
  code("SMTP_HOST=smtp.gmail.com"),
  code("SMTP_PORT=587"),
  code("SMTP_USER=ваш@gmail.com"),
  code("SMTP_PASS=app-password-из-google"),
  code("# SMTP_FROM=ваш@gmail.com  # необязательно"),

  p(""),
  p("Описание каждой переменной:"),
  envTable([
    ["NODE_ENV", "Да", "Всегда production на сервере"],
    ["PORT", "Да", "Порт API-сервера (8080). Nginx проксирует на него"],
    ["DATABASE_URL", "Да", "Строка подключения к PostgreSQL"],
    ["SESSION_SECRET", "Да", "Случайная строка для подписи сессий. Минимум 40 символов"],
    ["ADMIN_USERNAME", "Нет", "Логин для входа в панель администратора (по умолчанию: admin)"],
    ["ADMIN_PASSWORD", "Нет", "Пароль для входа в панель (по умолчанию: admin — ОБЯЗАТЕЛЬНО смените!)"],
    ["COOKIE_SECURE", "Нет", "Установите true ТОЛЬКО при наличии HTTPS. При HTTP оставьте пустым или false"],
    ["TELEGRAM_BOT_TOKEN", "Да", "Токен бота от @BotFather"],
    ["TELEGRAM_WEBHOOK_SECRET", "Да", "Секрет для проверки запросов от Telegram (любая строка)"],
    ["SMTP_HOST", "Да", "SMTP-сервер. Для Gmail: smtp.gmail.com"],
    ["SMTP_PORT", "Да", "Порт SMTP. Для Gmail TLS: 587"],
    ["SMTP_USER", "Да", "Email-адрес для отправки писем"],
    ["SMTP_PASS", "Да", "Пароль приложения Google (не основной пароль!)"],
    ["SMTP_FROM", "Нет", "Отображаемый адрес отправителя. По умолчанию = SMTP_USER"],
  ]),

  p(""),
  h2("5.1. Генерация SESSION_SECRET"),
  p("Сгенерируйте надёжный секрет командой:"),
  code("node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),

  h2("5.2. Пароль приложения Gmail"),
  bullet("Включите двухфакторную аутентификацию в Google-аккаунте"),
  bullet("Перейдите: Аккаунт Google → Безопасность → Пароли приложений"),
  bullet("Создайте пароль для «Почта» → скопируйте его в SMTP_PASS"),
  note("Используйте пароль приложения, а не основной пароль — иначе Google заблокирует вход."),

  // ── 6. DATABASE ──
  h1("6. База данных PostgreSQL"),
  h2("6.1. Установка PostgreSQL"),
  code("sudo apt install -y postgresql postgresql-contrib"),
  code("sudo systemctl enable postgresql"),
  code("sudo systemctl start postgresql"),

  h2("6.2. Создание пользователя и базы"),
  code("sudo -u postgres psql"),
  p("В консоли psql выполните:"),
  code("CREATE USER facadebot WITH PASSWORD 'ваш_пароль';"),
  code("CREATE DATABASE facadebot OWNER facadebot;"),
  code("GRANT ALL PRIVILEGES ON DATABASE facadebot TO facadebot;"),
  code("\\q"),

  h2("6.3. Применение схемы базы данных"),
  p("Экспортируйте переменные окружения и применяйте схему Drizzle:"),
  code("export $(grep -v '^#' .env | xargs)"),
  code("pnpm --filter @workspace/db run push"),
  tip("Команда push создаёт все таблицы автоматически по схеме Drizzle ORM."),

  // ── 7. BUILD & PM2 ──
  h1("7. Сборка и первый запуск (PM2)"),
  h2("7.1. Сборка проекта"),
  code("pnpm --filter @workspace/api-server run build"),
  code("pnpm --filter @workspace/admin-panel run build"),
  p("Результаты сборки:"),
  bullet("API-сервер → artifacts/api-server/dist/index.mjs"),
  bullet("Панель администратора → artifacts/admin-panel/dist/public/"),

  h2("7.2. Создание ecosystem.config.cjs"),
  p("Создайте файл конфигурации PM2 в корне проекта:"),
  code("nano ecosystem.config.cjs"),
  p("Содержимое:"),
  code("module.exports = {"),
  code("  apps: ["),
  code("    {"),
  code("      name: 'facadebot-api',"),
  code("      script: './artifacts/api-server/dist/index.mjs',"),
  code("      interpreter: 'node',"),
  code("      env_file: '.env',"),
  code("      instances: 1,"),
  code("      autorestart: true,"),
  code("      watch: false,"),
  code("      max_memory_restart: '512M',"),
  code("      log_date_format: 'YYYY-MM-DD HH:mm:ss',"),
  code("    },"),
  code("  ],"),
  code("};"),

  h2("7.3. Запуск через PM2"),
  code("pm2 start ecosystem.config.cjs"),
  code("pm2 save"),
  p("Проверка статуса:"),
  code("pm2 status"),
  code("pm2 logs facadebot-api --lines 50"),
  tip("Статус «online» — сервер запущен. Если «errored» — смотрите логи: pm2 logs"),

  // ── 8. NGINX ──
  h1("8. Настройка Nginx"),
  h2("8.1. Установка Nginx"),
  code("sudo apt install -y nginx"),
  code("sudo systemctl enable nginx"),

  h2("8.2. Конфигурация (HTTP, до SSL)"),
  p("Создайте файл конфигурации:"),
  code("sudo nano /etc/nginx/sites-available/facadebot"),
  p("Содержимое (замените YOUR_DOMAIN на ваш домен или IP):"),
  code("server {"),
  code("    listen 80;"),
  code("    server_name YOUR_DOMAIN;"),
  code(""),
  code("    # Панель администратора (статика)"),
  code("    location / {"),
  code("        root /home/facadebot/facadebot/artifacts/admin-panel/dist/public;"),
  code("        index index.html;"),
  code("        try_files $uri $uri/ /index.html;"),
  code("    }"),
  code(""),
  code("    # API-сервер (проксирование)"),
  code("    location /api/ {"),
  code("        proxy_pass http://127.0.0.1:8080;"),
  code("        proxy_http_version 1.1;"),
  code("        proxy_set_header Host $host;"),
  code("        proxy_set_header X-Real-IP $remote_addr;"),
  code("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"),
  code("        proxy_set_header X-Forwarded-Proto $scheme;"),
  code("    }"),
  code("}"),
  p(""),
  code("sudo ln -s /etc/nginx/sites-available/facadebot /etc/nginx/sites-enabled/"),
  code("sudo nginx -t"),
  code("sudo systemctl reload nginx"),

  h2("8.3. Получение SSL-сертификата (Let's Encrypt)"),
  note("Telegram требует HTTPS для вебхука. Этот шаг обязателен при использовании домена."),
  code("sudo apt install -y certbot python3-certbot-nginx"),
  code("sudo certbot --nginx -d YOUR_DOMAIN"),
  p("После certbot ваш /etc/nginx/sites-available/facadebot обновится автоматически с HTTPS-настройками."),
  tip("Certbot добавит автоматическое обновление сертификата в cron."),

  // ── 9. WEBHOOK ──
  h1("9. Регистрация Telegram-вебхука"),
  p(
    "После успешного запуска сервера и настройки HTTPS зарегистрируйте вебхук у Telegram:"
  ),
  code(
    "curl -X POST \"https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook\" \\"
  ),
  code("  -H \"Content-Type: application/json\" \\"),
  code("  -d '{\"url\": \"https://YOUR_DOMAIN/api/bot/webhook\","),
  code("       \"secret_token\": \"<TELEGRAM_WEBHOOK_SECRET>\"}'"),
  p("Успешный ответ:"),
  code('{"ok":true,"result":true,"description":"Webhook was set"}'),
  p("Проверка статуса вебхука:"),
  code(
    "curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
  ),

  // ── 10. CHECK ──
  h1("10. Проверка работы"),
  p("Последовательно проверьте каждый компонент:"),
  numbered("Откройте в браузере https://YOUR_DOMAIN — должна открыться страница входа в панель администратора"),
  numbered("Войдите с ADMIN_USERNAME / ADMIN_PASSWORD — должна открыться главная страница"),
  numbered("Откройте раздел «Регионы» и добавьте тестовый регион"),
  numbered("Напишите боту в Telegram — должно прийти приветственное сообщение"),
  numbered("Проверьте логи PM2: pm2 logs facadebot-api"),
  p(""),
  note(
    "Если панель открывается, но API-запросы возвращают 401 — значит сессия не сохраняется. " +
      "Убедитесь что SESSION_SECRET задан и Nginx передаёт заголовок Cookie."
  ),

  // ── 11. UPDATE ──
  h1("11. Обновление проекта (Replit → сервер)"),
  p(
    "Этот раздел описывает полный процесс обновления: от изменений в Replit до применения на продакшн-сервере."
  ),

  h2("11.1. После изменений в Replit"),
  p("Когда вы вносите изменения в код через Replit:"),
  numbered("Убедитесь, что типы проходят проверку: в Replit откройте Shell и выполните:"),
  code("pnpm run typecheck"),
  numbered("Убедитесь в отсутствии ошибок сборки:"),
  code("pnpm --filter @workspace/api-server run build"),
  code("pnpm --filter @workspace/admin-panel run build"),
  numbered("Закоммитьте и запушьте изменения в GitHub:"),
  code("git add -A"),
  code("git commit -m \"Описание изменений\""),
  code("git push origin main"),

  h2("11.2. Применение обновлений на сервере"),
  p("Подключитесь к серверу по SSH и выполните следующие шаги:"),

  h3("Шаг 1. Получить последние изменения"),
  code("cd ~/facadebot"),
  code("git pull origin main"),

  h3("Шаг 2. Обновить зависимости (если изменился package.json)"),
  code("pnpm install"),
  note("Если package.json не менялся — этот шаг можно пропустить."),

  h3("Шаг 3. Пересобрать проект"),
  code("pnpm --filter @workspace/api-server run build"),
  code("pnpm --filter @workspace/admin-panel run build"),

  h3("Шаг 4. Если изменилась схема базы данных"),
  p("Если вы добавляли/изменяли таблицы в lib/db/src/schema.ts:"),
  code("export $(grep -v '^#' .env | xargs)"),
  code("pnpm --filter @workspace/db run push"),
  note(
    "Если схема БД не менялась — этот шаг пропускайте. " +
      "Команда push безопасна — она добавляет новые колонки, но не удаляет существующие данные."
  ),

  h3("Шаг 5. Перезапустить API-сервер"),
  code("pm2 restart facadebot-api"),
  code("pm2 logs facadebot-api --lines 30"),
  tip("Nginx перезапускать не нужно — он отдаёт статику напрямую из папки dist."),

  h3("Шаг 6. Обновить статику панели (уже выполнено в шаге 3)"),
  p(
    "Nginx читает статику панели администратора прямо из " +
      "artifacts/admin-panel/dist/public/. " +
      "После пересборки (шаг 3) новые файлы уже на месте — дополнительных действий не нужно."
  ),

  h2("11.3. Быстрый скрипт обновления"),
  p(
    "Для удобства создайте файл update.sh в корне проекта на сервере " +
      "и запускайте его при каждом обновлении:"
  ),
  code("nano ~/facadebot/update.sh"),
  p("Содержимое:"),
  code("#!/bin/bash"),
  code("set -e"),
  code("echo \"[1/5] Получаем изменения...\""),
  code("git pull origin main"),
  code("echo \"[2/5] Устанавливаем зависимости...\""),
  code("pnpm install"),
  code("echo \"[3/5] Собираем API-сервер...\""),
  code("pnpm --filter @workspace/api-server run build"),
  code("echo \"[4/5] Собираем панель администратора...\""),
  code("pnpm --filter @workspace/admin-panel run build"),
  code("echo \"[5/5] Перезапускаем PM2...\""),
  code("pm2 restart facadebot-api"),
  code("echo \"Готово! Статус:\""),
  code("pm2 status"),
  p("Сделайте скрипт исполняемым:"),
  code("chmod +x ~/facadebot/update.sh"),
  p("Запуск обновления:"),
  code("cd ~/facadebot && ./update.sh"),
  tip(
    "Если схема БД менялась, добавьте перед pm2 restart строку: " +
      "export $(grep -v '^#' .env | xargs) && pnpm --filter @workspace/db run push"
  ),

  h2("11.4. Что делать, если что-то пошло не так"),
  p("Если после обновления API не запускается:"),
  bullet("Смотрите логи: pm2 logs facadebot-api --lines 100"),
  bullet("Проверьте переменные окружения: pm2 env facadebot-api"),
  bullet(
    "Откатитесь к предыдущей версии: git log --oneline → git checkout <commit>  → rebuild → pm2 restart"
  ),
  p("Если панель администратора показывает старую версию:"),
  bullet("Очистите кэш браузера (Ctrl+Shift+R / Cmd+Shift+R)"),
  bullet("Убедитесь, что сборка прошла без ошибок"),

  // ── 12. USEFUL COMMANDS ──
  h1("12. Полезные команды"),

  h2("PM2"),
  code("pm2 status                          # статус всех процессов"),
  code("pm2 logs facadebot-api              # логи в реальном времени"),
  code("pm2 logs facadebot-api --lines 100  # последние 100 строк логов"),
  code("pm2 restart facadebot-api           # перезапустить"),
  code("pm2 stop facadebot-api              # остановить"),
  code("pm2 delete facadebot-api            # удалить из PM2"),
  code("pm2 monit                           # интерактивный мониторинг"),

  h2("Nginx"),
  code("sudo nginx -t                       # проверить конфиг"),
  code("sudo systemctl reload nginx         # применить конфиг без прерывания"),
  code("sudo systemctl restart nginx        # полный перезапуск"),
  code("sudo tail -f /var/log/nginx/error.log  # лог ошибок"),

  h2("PostgreSQL"),
  code("sudo -u postgres psql               # консоль postgres"),
  code("\\l                                  # список баз данных"),
  code("\\c facadebot                        # подключиться к базе"),
  code("\\dt                                 # список таблиц"),
  code("\\q                                  # выход"),

  h2("Certbot (SSL)"),
  code("sudo certbot renew --dry-run        # проверить автообновление"),
  code("sudo certbot certificates           # список сертификатов"),

  divider(),
  new Paragraph({
    children: [
      new TextRun({
        text: "Документ сгенерирован автоматически для проекта FacadeBot.",
        font: BODY_FONT,
        size: 18,
        italics: true,
        color: "888888",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  }),
];

// ─── build & save ────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "numbered-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
            style: {
              paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } },
            },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: { font: BODY_FONT, size: 22, color: "222222" },
        paragraph: { spacing: { line: 276 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { font: BODY_FONT, size: 32, bold: true, color: "1F3864" },
        paragraph: { spacing: { before: 400, after: 160 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { font: BODY_FONT, size: 26, bold: true, color: "2E4057" },
        paragraph: { spacing: { before: 280, after: 100 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { font: BODY_FONT, size: 22, bold: true, color: "374151" },
        paragraph: { spacing: { before: 220, after: 60 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
          },
        },
      },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("facadebot_install_guide.docx", buffer);
console.log("✓ facadebot_install_guide.docx создан успешно");
