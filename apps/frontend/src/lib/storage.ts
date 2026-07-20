import { LOCAL_STORAGE_KEY } from './variables/example';

export function setLocalStorage(key: string, value: string) {
  localStorage.setItem(`${key}`, value);
}

export function getLocalStorage<TValue = string>(key: string): TValue {
  return localStorage.getItem(`${key}`) as TValue;
}

export function removeLocalStorage(key: string) {
  localStorage.removeItem(`${key}`);
}

export function removeLocalStorageUserLogin() {
  removeLocalStorage(LOCAL_STORAGE_KEY.User);
}
