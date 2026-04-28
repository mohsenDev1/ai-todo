# AI Todo App

تطبيق مهام كامل (Full-stack) يدعم تسجيل المستخدمين، إدارة المهام، والاقتراحات الذكية.

## شنو استخدمنا بالمشروع

- **Frontend:** React + TypeScript + Vite + CSS Modules
- **Backend:** Node.js + Express + TypeScript (تشغيل عبر `tsx`)
- **Database:** Prisma ORM مع SQLite
- **Validation:** Zod للتحقق من بيانات الطلبات
- **Authentication:** JWT + تشفير كلمات المرور باستخدام `bcryptjs`
- **AI Feature:** اقتراحات ذكية للمهام المفتوحة

## هيكلة المشروع

- `Frontend/` كل ما يخص الواجهة
  - `Frontend/src/` كود React
  - `Frontend/public/` ملفات static
  - `Frontend/index.html` نقطة دخول Vite
- `backend/` كل ما يخص الخادم
  - `backend/server/src/` API + Auth + Validation + AI logic
  - `backend/prisma/schema.prisma` موديلات قاعدة البيانات
  - `backend/render.yaml` إعداد نشر الباكند على Render

## المميزات

- تسجيل مستخدم جديد + تسجيل دخول
- حماية endpoints باستخدام JWT
- CRUD كامل للمهام (إنشاء، قراءة، تحديث، حذف)
- بحث + فلترة + ترتيب للمهام
- Validation ورسائل خطأ واضحة
- اقتراحات AI:
  - رفع أولوية المهمة
  - اقتراح موعد استحقاق
  - اقتراح Tag مناسب

## API Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/ai/suggestions`

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`
- `VITE_API_URL`

## التشغيل المحلي

1. تثبيت الحزم:

```bash
npm install
```

2. تجهيز Prisma:

```bash
npm run prisma:generate
npm run prisma:push
```

3. تشغيل الباكند:

```bash
npm run dev:server
```

4. تشغيل الفرونت (بترمنل ثاني):

```bash
npm run dev
```

- الواجهة: `http://localhost:5173`
- API: `http://localhost:4000`

## Build

```bash
npm run build
```
