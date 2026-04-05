/**
 * Telegram WebApp Compatibility Utilities
 * 
 * This file provides utilities for ensuring the app works correctly
 * inside Telegram bot webview. It handles WebApp initialization,
 * theme adaptation, and Telegram-specific features.
 */

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        // Properties
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date?: number;
          hash?: string;
        };
        version: string;
        platform: 'android' | 'ios' | 'macos' | 'tdesktop' | 'web' | 'webk' | 'weba';
        colorScheme: 'light' | 'dark';
        themeParams: {
          button_color?: string;
          button_text_color?: string;
          hint_color?: string;
          link_color?: string;
          text_color?: string;
          bg_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          accent_text_color?: string;
          section_bg_color?: string;
          section_header_text_color?: string;
          subtitle_text_color?: string;
          destructive_text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        isClosingConfirmationEnabled: boolean;
        isVerticalSwipesEnabled: boolean;
        isSettingsButtonVisible: boolean;
        isBackButtonShown: boolean;
        isInfoButtonShown: boolean;
        isMainButtonVisible: boolean;
        isSecondaryButtonVisible: boolean;
        headerColor: string;
        backgroundColor: string;

        // Methods
        ready(): void;
        expand(): void;
        close(): void;
        openLink(url: string, options?: { try_instant_view?: boolean }): void;
        openTelegramLink(url: string): void;
        switchInlineQuery(query: string, chooseChatTypes?: string[]): void;
        shareUrlToStory(url: string, options?: { text?: string }): void;
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type: 'ok' | 'cancel' | 'default' | 'destructive';
            text?: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback?: (result: boolean) => void): void;
        showScanQR(text?: string): void;
        HapticFeedback: {
          impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
          notificationOccurred(type: 'error' | 'success' | 'warning'): void;
          selectionChanged(): void;
        };
        BiometricManager?: {
          isInited: boolean;
          isBiometricAvailable: boolean;
          isBiometricEnabled: boolean;
          isFaceVerificationEnabled: boolean;
          accessRequested: boolean;
          accessGranted: boolean;
          isBiometricTokenSaved: boolean;
          deviceId: string;
          init(callback: (success: boolean) => void): void;
          authenticate(reason?: string, callback?: (success: boolean, token?: string) => void): void;
          updateBiometricToken(token: string, callback?: (success: boolean) => void): void;
          openSettings(callback?: () => void): void;
        };
        CloudStorage?: {
          setItem(key: string, value: string, callback?: (error: Error | null, success?: boolean) => void): void;
          getItem(key: string, callback?: (error: Error | null, value?: string) => void): void;
          getItems(keys: string[], callback?: (error: Error | null, values: { [key: string]: string }) => void): void;
          removeItem(key: string, callback?: (error: Error | null, success?: boolean) => void): void;
          removeItems(keys: string[], callback?: (error: Error | null, success?: boolean) => void): void;
          getKeys(callback?: (error: Error | null, keys: string[]) => void): void;
        };

        // Events
        onEvent(eventType: string, eventHandler: () => void): void;
        offEvent(eventType: string, eventHandler: () => void): void;
        MainButton: {
          text: string;
          color: string;
          text_color: string;
          is_active: boolean;
          is_visible: boolean;
          is_progress_visible: boolean;
          height: number;
          show(): void;
          hide(): void;
          enable(): void;
          disable(): void;
          showProgress(leaveActive?: boolean): void;
          hideProgress(): void;
          setText(text: string): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          setParams(params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }): void;
        };
        BackButton: {
          is_visible: boolean;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        SecondaryButton?: {
          text: string;
          is_active: boolean;
          is_visible: boolean;
          height: number;
          show(): void;
          hide(): void;
          enable(): void;
          disable(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          setText(text: string): void;
          setParams(params: {
            text?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }): void;
        };
      };
    };
  }
}

// ============================================
// Type Exports
// ============================================

export type TelegramPlatform = 'android' | 'ios' | 'macos' | 'tdesktop' | 'web' | 'webk' | 'weba';
export type TelegramColorScheme = 'light' | 'dark';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramThemeParams {
  button_color?: string;
  button_text_color?: string;
  hint_color?: string;
  link_color?: string;
  text_color?: string;
  bg_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

// ============================================
// Core Functions
// ============================================

/**
 * Check if the app is running inside Telegram WebApp
 */
export const isTelegramWebApp = (): boolean => {
  return !!(window.Telegram && window.Telegram.WebApp);
};

/**
 * Get the Telegram WebApp instance
 */
export const getTelegramWebApp = (): typeof window.Telegram.WebApp | null => {
  return window.Telegram?.WebApp || null;
};

/**
 * Initialize Telegram WebApp
 * Call this early in your app startup
 */
export const initTelegramWebApp = (): void => {
  if (!isTelegramWebApp()) {
    console.log('ℹ️ Not running inside Telegram WebApp');
    return;
  }

  const WebApp = window.Telegram!.WebApp;
  
  // Tell Telegram the app is ready
  WebApp.ready();
  
  // Expand to full height
  WebApp.expand();
  
  // Enable closing confirmation if available
  if ('enableClosingConfirmation' in WebApp) {
    (WebApp as any).enableClosingConfirmation();
  }
  
  console.log('✅ Telegram WebApp initialized');
  console.log('📱 Platform:', WebApp.platform);
  console.log('🎨 Color scheme:', WebApp.colorScheme);
  console.log('👤 User:', WebApp.initDataUnsafe?.user);
};

/**
 * Get the current Telegram user (if available)
 */
export const getTelegramUser = (): TelegramUser | undefined => {
  if (!isTelegramWebApp()) return undefined;
  return window.Telegram?.WebApp.initDataUnsafe?.user;
};

export const getTelegramWebAppUserId = (): string | null => {
  const user = getTelegramUser();
  return user?.id ? String(user.id) : null;
};

/**
 * Get the current color scheme
 */
export const getTelegramColorScheme = (): TelegramColorScheme => {
  if (!isTelegramWebApp()) return 'light';
  return window.Telegram?.WebApp.colorScheme || 'light';
};

/**
 * Get the current theme params
 */
export const getTelegramThemeParams = (): TelegramThemeParams => {
  if (!isTelegramWebApp()) return {};
  return window.Telegram?.WebApp.themeParams || {};
};

/**
 * Check if running on mobile Telegram
 */
export const isTelegramMobile = (): boolean => {
  if (!isTelegramWebApp()) return false;
  const platform = window.Telegram?.WebApp.platform;
  return platform === 'android' || platform === 'ios';
};

// ============================================
// UI Functions
// ============================================

/**
 * Show a popup dialog
 */
export const showTelegramPopup = (
  params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type: 'ok' | 'cancel' | 'default' | 'destructive';
      text?: string;
    }>;
  },
  callback?: (buttonId: string) => void
): void => {
  if (!isTelegramWebApp()) {
    console.warn('⚠️ Telegram WebApp not available, using alert instead');
    alert(params.message);
    return;
  }

  window.Telegram!.WebApp.showPopup(params, callback);
};

/**
 * Show a confirmation dialog
 */
export const showTelegramConfirm = (
  message: string,
  callback?: (result: boolean) => void
): void => {
  if (!isTelegramWebApp()) {
    const result = confirm(message);
    callback?.(result);
    return;
  }

  window.Telegram!.WebApp.showConfirm(message, callback);
};

/**
 * Show an alert
 */
export const showTelegramAlert = (
  message: string,
  callback?: () => void
): void => {
  if (!isTelegramWebApp()) {
    alert(message);
    callback?.();
    return;
  }

  window.Telegram!.WebApp.showAlert(message, callback);
};

/**
 * Trigger haptic feedback
 */
export const triggerHapticFeedback = (
  type: 'impact' | 'notification' | 'selection',
  style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning'
): void => {
  if (!isTelegramWebApp()) return;

  const { HapticFeedback } = window.Telegram!.WebApp;
  
  switch (type) {
    case 'impact':
      HapticFeedback.impactOccurred((style as 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') || 'light');
      break;
    case 'notification':
      HapticFeedback.notificationOccurred((style as 'error' | 'success' | 'warning') || 'success');
      break;
    case 'selection':
      HapticFeedback.selectionChanged();
      break;
  }
};

/**
 * Open a link in Telegram's in-app browser
 */
export const openTelegramLink = (url: string): void => {
  if (!isTelegramWebApp()) {
    window.open(url, '_blank');
    return;
  }

  window.Telegram!.WebApp.openLink(url);
};

/**
 * Close the Telegram WebApp
 */
export const closeTelegramWebApp = (): void => {
  if (!isTelegramWebApp()) {
    window.close();
    return;
  }

  window.Telegram!.WebApp.close();
};

// ============================================
// Main Button Functions
// ============================================

/**
 * Show the Telegram Main Button
 */
export const showMainButton = (
  text: string,
  onClick: () => void,
  options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
  }
): void => {
  if (!isTelegramWebApp()) {
    console.warn('⚠️ Telegram WebApp not available, Main Button not shown');
    return;
  }

  const { MainButton } = window.Telegram!.WebApp;
  
  if (text) MainButton.setText(text);
  if (options?.color) MainButton.color = options.color;
  if (options?.textColor) MainButton.text_color = options.textColor;
  
  MainButton.onClick(onClick);
  MainButton.show();
  
  if (options?.isActive !== false) {
    MainButton.enable();
  }
};

/**
 * Hide the Telegram Main Button
 */
export const hideMainButton = (): void => {
  if (!isTelegramWebApp()) return;
  window.Telegram!.WebApp.MainButton.hide();
};

/**
 * Show progress on the Telegram Main Button
 */
export const showMainButtonProgress = (): void => {
  if (!isTelegramWebApp()) return;
  window.Telegram!.WebApp.MainButton.showProgress();
};

/**
 * Hide progress on the Telegram Main Button
 */
export const hideMainButtonProgress = (): void => {
  if (!isTelegramWebApp()) return;
  window.Telegram!.WebApp.MainButton.hideProgress();
};

// ============================================
// Back Button Functions
// ============================================

/**
 * Show the Telegram Back Button
 */
export const showBackButton = (onClick: () => void): void => {
  if (!isTelegramWebApp()) return;
  window.Telegram!.WebApp.BackButton.onClick(onClick);
  window.Telegram!.WebApp.BackButton.show();
};

/**
 * Hide the Telegram Back Button
 */
export const hideBackButton = (): void => {
  if (!isTelegramWebApp()) return;
  window.Telegram!.WebApp.BackButton.hide();
};

// ============================================
// Theme Adaptation
// ============================================

/**
 * Apply Telegram theme colors to CSS custom properties
 * This helps the app adapt to Telegram's theme
 */
export const applyTelegramTheme = (): void => {
  if (!isTelegramWebApp()) return;

  const themeParams = getTelegramThemeParams();
  const root = document.documentElement;

  // Apply theme colors to CSS custom properties
  if (themeParams.bg_color) {
    root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
  }
  if (themeParams.text_color) {
    root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
  }
  if (themeParams.hint_color) {
    root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
  }
  if (themeParams.link_color) {
    root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
  }
  if (themeParams.button_color) {
    root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
  }
  if (themeParams.button_text_color) {
    root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
  }
  if (themeParams.secondary_bg_color) {
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
  }

  console.log('🎨 Telegram theme applied');
};

// ============================================
// Storage Functions (Telegram Cloud Storage)
// ============================================

/**
 * Set an item in Telegram Cloud Storage
 */
export const setTelegramStorageItem = (
  key: string,
  value: string,
  callback?: (error: Error | null, success?: boolean) => void
): void => {
  if (!isTelegramWebApp() || !window.Telegram!.WebApp.CloudStorage) {
    console.warn('⚠️ Telegram Cloud Storage not available');
    callback?.(new Error('Cloud Storage not available'));
    return;
  }

  window.Telegram!.WebApp.CloudStorage.setItem(key, value, callback);
};

/**
 * Get an item from Telegram Cloud Storage
 */
export const getTelegramStorageItem = (
  key: string,
  callback?: (error: Error | null, value?: string) => void
): void => {
  if (!isTelegramWebApp() || !window.Telegram!.WebApp.CloudStorage) {
    console.warn('⚠️ Telegram Cloud Storage not available');
    callback?.(new Error('Cloud Storage not available'));
    return;
  }

  window.Telegram!.WebApp.CloudStorage.getItem(key, callback);
};

// ============================================
// Exports
// ============================================

export default {
  isTelegramWebApp,
  getTelegramWebApp,
  initTelegramWebApp,
  getTelegramUser,
  getTelegramColorScheme,
  getTelegramThemeParams,
  isTelegramMobile,
  showTelegramPopup,
  showTelegramConfirm,
  showTelegramAlert,
  triggerHapticFeedback,
  openTelegramLink,
  closeTelegramWebApp,
  showMainButton,
  hideMainButton,
  showMainButtonProgress,
  hideMainButtonProgress,
  showBackButton,
  hideBackButton,
  applyTelegramTheme,
  setTelegramStorageItem,
  getTelegramStorageItem
};
