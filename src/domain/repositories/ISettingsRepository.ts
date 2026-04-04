export interface ISettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getNumber(key: string): Promise<number | null>;
  setNumber(key: string, value: number): Promise<void>;
  getBoolean(key: string): Promise<boolean | null>;
  setBoolean(key: string, value: boolean): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}
