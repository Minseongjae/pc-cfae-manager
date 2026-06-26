export const DEFAULT_STORE_NAME = 'Blaze 창신점';
export const APP_STORAGE_PREFIX = 'blaze-changsin-manager';

export function getAppTitle(): string {
  return `${DEFAULT_STORE_NAME} Manager`;
}

export function isDefaultStoreName(name: string | undefined): boolean {
  return !name || name === DEFAULT_STORE_NAME || name === '1% PC&CAFE';
}
