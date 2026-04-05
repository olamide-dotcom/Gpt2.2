export const getTelegramWebAppUserId = (): string | null => {
  try {
    const win = window as any;
    const webApp = win?.Telegram?.WebApp;
    const user = webApp?.initDataUnsafe?.user ?? webApp?.initData?.user ?? null;
    if (user && user.id) return String(user.id);
    return null;
  } catch {
    return null;
  }
};
