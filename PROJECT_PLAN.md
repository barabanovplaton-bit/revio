# ПЛАН ПРОЕКТА: Revio

## КТО Я И ЧТО ДЕЛАЮ
- Платон, 14 лет
- SaaS для фрилансеров: правки с картинками через маячки
- MVP за 3-4 дня (ГОТОВ)
- Цель: выйти к деньгам до конца лета 2025

## РАБОЧАЯ ПАПКА
`C:\Users\Платон\Documents\GitHub\revio`

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

## ТАРИФЫ
- **Free:** 1 проект, 10 картинок, 5 кругов правок
- **Pro 299₽/мес:** безлимит проектов, безлимит картинок, безлимит кругов, история, приоритетная поддержка

## ПЛАН ДЕЙСТВИЙ (обновлён 17.07.2025)

### ШАГ 1 — Дизайн + настройки + уведомления ✅ ГОТОВ
- Шапка: sticky, тоньше, логотип слева, аватар справа, колокольчик
- Кнопка "Новый проект" — белая, побольше
- Поиск — уже по ширине
- Меню аватара: имя, email, тариф (клик → /pricing), настройки, выйти
- Настройки: редактируемое имя, профиль (email + фото Google), "О сервисе", тариф, "Смотреть тарифы", "Выйти"
- Колокольчик: иконка BellIcon

### ШАГ 2 — Страница тарифов ✅ ГОТОВ
- Отдельная страница `/pricing`
- 2 тарифа: Free / Pro 299₽
- Аккордеон FAQ (7 вопросов, кликабельные, centered text, hover highlight)
- Ссылка из настроек и popover аватара

### ШАГ 3 — Логин/регистрация ✅ ГОТОВ
- Отдельная страница `/login`
- Два экрана: выбор способа (Google / Почта) → два таба (Войти / Зарегистрироваться)
- Пароль min 6 символов, счётчик
- «Забыли пароль?» → Firebase sendPasswordReset
- «← На главную» + «← Назад»
- Google OAuth + email/password
- Ошибки на русском: "Аккаунт не найден", "Email уже зарегистрирован" и т.д.
- Loading screen после входа/регистрации (логотип R + спиннер, ~800мс)

### ШАГ 4 — Онбординг ✅ ГОТОВ
- Мандатный 3-шаговый онбординг после регистрации
- Прогресс-бар (3 полоски, sticky сверху)
- Шаг 1: имя + аватар + email, поле по центру экрана (min-h + items-center)
- Шаг 2: 6 профессий (Дизайнер сайтов, Карточек, Интерьеров, Иллюстратор, Фотограф, Другое) — 1 колонка, h-12
- Шаг 3: 8 рефералов (YouTube, TikTok, Instagram, VK, Telegram, ChatGPT, Поиск, Друг, Другое) — 1 колонка, h-12
- Кнопки «Назад/Далее» с mt-5, pb-16 для отступа от низа
- «Другое» — просто кнопка без поля ввода (в Firestore: "other")
- Анимации: opacity + x: 0.3s easeInOut
- Scroll container: overflow-y-auto, pb-12 + pb-16 на внутреннем div

### ШАГ 5 — Страница уведомлений ✅ ГОТОВ
- Отдельная страница `/notifications`
- Пустое состояние: "Пока нет уведомлений"

### ШАГ 6 — Loading screen ✅ ГОТОВ
- После входа/регистрации: ?loading=true → чёрный экран с логотипом R + спиннер
- Автоматически убирается через ~800мс
- Профиль загружается до показа главной → нет мерцания рабочего места перед онбордингом

## КЛЮЧЕВЫЕ РЕШЕНИЯ
- UI: одна страница-список (НЕ сайдбар)
- Only images (MVP)
- Manual payment activation (без ЮKassa на старте)
- Dark theme (чёрно-белая, акцент #E880FC)
- Язык: русский + английский
- Окружение: web-designer, card-designer, interior-designer, illustrator, photographer, other
- Рефералы: YouTube, TikTok, Instagram, VK, Telegram, ChatGPT, Поиск, Друг, Другое
- «Другое» — просто кнопка без поля ввода (значение "other" в БД)
- 7-дневныйtrial НЕ предлагается — Free план и так достаточно
- Онбординг: мандатный 3-шаговый, сохраняется в Firestore
- Loading screen: после login/register, убирается мерцание рабочего места

## МОДЕЛИ ДАННЫХ

### UserProfile
```typescript
{
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  occupation: "web-designer" | "card-designer" | "interior-designer" | "illustrator" | "photographer" | "other";
  referralSource: "youtube" | "tiktok" | "instagram" | "vk" | "telegram" | "ai" | "search" | "friend" | "other";
  onboardingCompleted: boolean;
  plan: "free" | "pro";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Project
```typescript
{
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  imageUrls: string[];
  currentRound: number;
  roundsTotal: number;
  roundsLeft: number;
  limitMessage: string;
  isLocked: boolean;
  pinned: boolean;
  archived: boolean;
  icon: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Marker
```typescript
{
  id: string;
  projectId: string;
  round: number;
  type: "point" | "general";
  x?: number;  // 0-1
  y?: number;  // 0-1
  text: string;
  createdAt: Timestamp;
}
```

## ДЛЯ НОВОЙ СЕССИИ
1. Прочитать этот файл
2. Рабочая папка: `C:\Users\Платон\Documents\GitHub\revio`
3. Начать с текущего шага (см. "ТЕКУЩИЙ")
4. Записывать важные решения в этот файл

## СЛЕДУЮЩИЕ ШАГИ
### ШАГ 7 — Улучшение создания проекта
- Иконки для проектов (выбор из набора)
- Превью проекта перед созданием

### ШАГ 8 — Улучшение canvas UX
- Zoom in/out
- Undo/redo
- Undo/redo для общих комментариев

### ШАГ 9 — Hover-preview изображений
- При наведении на карточку проекта — превью картинок

### ШАГ 10 — Реалтайм уведомления
- Firebase Cloud Messaging
- Красная точка на колокольчике
- Текст в выпадающем списке

### ШАГ 11 — Интеграция с оплатой
- СБП для россиян (сейчас)
- ЮKassa потом (друг сказал сложно)

### ШАГ 12 — Тест + деплой
- Запустить на Vercel
- Найти 1 тестового фрилансера
- Собрать фидбек
