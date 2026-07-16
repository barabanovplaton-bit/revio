# ПЛАН ПРОЕКТА: Revio

## КТО Я И ЧТО ДЕЛАЮ
- Платон, 14 лет
- SaaS для фрилансеров: правки с картинками через маячки
- MVP за 3-4 дня
- Цель: выйти к деньгам до конца лета 2025

## ЧТО ЭТО ЗА ПРОЕКТ
Платформа для фрилансеров, где:
- Фрилансер загружает картинки (макет)
- Генерируется ссылка для клиента
- Клиент ставит точечные/общие маячки на картинке
- Фрилансер видит метки в реалтайме
- Система кругов правок (лимиты)

## ТЕХНИЧЕСКИЙ СТАК
- Next.js 16 + React 19 + TypeScript
- Firebase (Firestore, Auth) — ключи уже есть
- Cloudinary (хранение картинок) — ключи уже есть
- Tailwind CSS + Framer Motion
- Деплой: Vercel + GitHub

## КЛЮЧЕВЫЕ РЕШЕНИЯ (записаны 16.07.2025)

### UI главной страницы
- **Вариант: одна страница-список** (НЕ сайдбар как ChatGPT)
- Список проектов карточками на всю ширину
- Кнопка "Новый проект" сверху
- Клик по карточке → внутрь проекта
- Сайдбар, canvas, onboarding — УБРАНЫ

### Монетизация
- Free: 1 проект, 1 круг правок
- 299₽/мес: безлимит проектов, до 5 кругов
- На старте: ручная активация (без ЮKassa)
- Потом: ЮKassa или напрямую на карту

### Форматы
- **Только картинки** (для MVP)
- Видео и сайты — добавим потом

## БАГИ КТО ИСПРАВИТЬ
1. `new-project-modal.tsx:330-584` — дублирующий return (мёртвый код)
2. `canvas.tsx:33` — ссылка на `p.clientName` которого нет в типе
3. `cloudinary.ts` — серверный SDK в клиентском компоненте (не работает)
4. `review/[id]/page.tsx:8` — `params` как plain object (Next.js 15+ нужен `React.use()`)

## ЧТО УДАЛИТЬ
- `app/_components/sidebar.tsx`
- `app/_components/canvas.tsx`
- `app/_components/onboarding-modal.tsx`
- `app/_components/onboarding-icons.tsx`
- `app/_lib/theme-context.tsx`
- `app/_lib/demo-data.ts`
- `app/login/page.tsx` (пока)
- `app/settings/page.tsx` (пока)

## ЧТО ПЕРЕПИСАТЬ
- `app/page.tsx` — одна страница-список проектов
- `app/_components/new-project-modal.tsx` — упростить, убрать duplicate return
- `lib/cloudinary.ts` — загрузка из браузера (API route или прямая)
- `app/review/[id]/page.tsx` — исправить params

## МОДЕЛИ ДАННЫХ

### Project (lib/projects.ts)
```typescript
{
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  imageUrls: string[];          // массив URL картинок (Cloudinary)
  currentRound: number;         // текущий круг правок
  roundsTotal: number;          // лимит кругов
  roundsLeft: number;           // осталось кругов
  limitMessage: string;         // сообщение при исчерпании лимита
  isLocked: boolean;            // заблокирован ли
  pinned: boolean;
  archived: boolean;
  icon: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Marker (lib/markers.ts)
```typescript
{
  id: string;
  projectId: string;
  round: number;
  type: "point" | "general";
  x?: number;                   // 0-1
  y?: number;                   // 0-1
  text: string;
  createdAt: Timestamp;
}
```

## ПОТОК ПРИЛОЖЕНИЯ

### Фрилансер:
1. Авторизация через Google
2. Создаёт проект (название, описание, лимит кругов)
3. Загружает картинки (Cloudinary)
4. Копирует ссылку /review/[id]
5. Отправляет клиенту

### Клиент:
1. Открывает ссылку /review/[id] (без авторизации)
2. Видит картинку + текущий круг (1/3)
3. Кликает на картинку → ставит точечный маркер
4. Или нажимает "Общий комментарий"
5. Пишет текст → маркер сохраняется (realtime)
6. Нажимает "Отправить правки" → проект блокируется

### Фрилансер:
1. Видит метки в реалтайме
2. Вносит правки
3. Загружает новую версию картинок
4. Круг увеличивается (2/3)
5. Ссылка снова активна

## ДЛЯ ЗАПУСКА
```bash
npm install
npm run dev
```
Открыть http://localhost:3000

## ДЛЯ НОВОЙ СЕССИИ
1. Прочитать этот файл
2. Прочитать код в lib/projects.ts, lib/markers.ts, lib/cloudinary.ts
3. Продолжить с текущего шага
4. Не терять контекст — писать важные решения в этот файл
