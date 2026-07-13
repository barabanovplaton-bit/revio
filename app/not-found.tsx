export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-page text-text-primary">
      <div className="text-center">
        <h2 className="mb-4 font-display text-2xl font-bold">Страница не найдена</h2>
        <a href="/" className="text-text-muted underline">
          Вернуться на главную
        </a>
      </div>
    </div>
  );
}
