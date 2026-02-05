# Parkent Market Hub Backend

Telegram bot va API backend uchun Node.js server.

## O'rnatish

1. Dependencies larni o'rnatish:
```bash
npm install
```

2. Environment faylini yaratish:
```bash
cp .env.example .env
```

3. `.env` faylni to'ldirish:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PORT=3001
NODE_ENV=development
```

## Ishga tushurish

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Telegram Webhook
- `POST /api/telegram/webhook` - Telegram dan kelgan xabarlarni qabul qiladi

### Telegram Auth
- `POST /api/telegram/auth` - Telegram kodini tasdiqlaydi

### Health Check
- `GET /api/health` - Server holatini tekshiradi

## Telegram Bot

Bot `node-telegram-bot-api` kutubxonasi orqali ishlaydi. Asosiy funksiyalari:

- `/start` komandasi uchun 6 xonali auth code yaratadi
- Kodni 5 daqiqa ichida tasdiqlash imkoniyati
- Foydalanuvchi profilini yaratish va tizimga kiritish

## Webhook sozlash

Agar webhook avtomatik sozlansin bo'lsa, `index.js` dan quyidagi qatorni oching:
```javascript
setWebhook();
```

Yoki Telegram API orqali qo'lda sozlang:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>
```

## Frontend bilan integratsiya

Frontend `src/lib/api.ts` orqali backend API ga murojaat qiladi. Environment variable `VITE_API_BASE_URL` orqali backend URL ni sozlashingiz mumkin.
# parkent-backend
