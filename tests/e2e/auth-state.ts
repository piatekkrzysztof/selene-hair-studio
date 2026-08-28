/**
 * Ścieżka do zapisanej sesji panelu.
 *
 * Osobny moduł, bo Playwright nie pozwala plikom testowym importować się
 * nawzajem - a i tak jest to zwykła stała konfiguracyjna, nie test.
 */
export const PANEL_STATE = "playwright/.auth/panel.json";
