import type { Storage } from "webextension-polyfill-ts";

export interface Options {
  /**
   * The mininum number that this extension can keep tabs.
   * The number of tabs can never be less than this number.
   * If there are more tabs than this, an oldest tab is closed until its number
   * is equal to minTabs.
   */
  minTabs: number;

  /**
   * Time limit for the tab to live if the number of tabs is more than minTabs.
   * The unit of this value is milliseconds.
   */
  baseLimit: number;
}

export class OptionsService {
  constructor(private storage: Storage.SyncStorageAreaSync) {}

  set(options: Options) {
    this.storage.set(options);
  }

  get(): Promise<Options>;
  get<K extends keyof Options>(key: K): Promise<Options[K]>;
  async get<K extends keyof Options>(key?: K): Promise<Options | Options[K]> {
    if (!key) {
      return this.storage.get() as Promise<Options>;
    }
    const options = (await this.storage.get(key)) as Options;
    return options[key];
  }
}
