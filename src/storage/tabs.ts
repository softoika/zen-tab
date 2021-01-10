import type { Storage } from "webextension-polyfill-ts";
import type { TabStorage as ActivatedTabsStorage } from "./activated-tabs";
import type { TabStorage as OutdatedTabsStorage } from "./outdated-tabs";
import type { TabHistoryStorage } from "./closed-tabs-history";
import { OutdatedTabs } from "./outdated-tabs";
import { ActivatedTabs } from "./activated-tabs";
import { ClosedTabsHistory } from "./closed-tabs-history";

type TabStorage = TabHistoryStorage &
  ActivatedTabsStorage &
  OutdatedTabsStorage;

export class TabStorageService {
  constructor(private localStorage: Storage.LocalStorageArea) {}

  get(): Promise<TabStorage>;
  get<K extends keyof TabStorage, V extends TabStorage[K]>(key: K): Promise<V>;
  async get<K extends keyof TabStorage, V extends TabStorage[K]>(
    key?: K
  ): Promise<TabStorage | V> {
    if (!key) {
      return this.localStorage.get();
    }
    const storage = await this.localStorage.get(key);
    return storage[key];
  }

  async getStorage<K extends keyof TabStorage>(
    keys: K[]
  ): Promise<Pick<TabStorage, K>> {
    const storage: TabStorage = await this.localStorage.get(keys);
    return storage;
  }

  async getValue<K extends keyof TabStorage>(
    key: K
  ): Promise<TabStorage[K] | undefined> {
    const storage = await this.localStorage.get(key);
    return storage[key];
  }

  updateStorage(value: TabStorage) {
    this.localStorage.set(value);
  }

  async getClosedTabHistory(): Promise<ClosedTabsHistory> {
    const { tabs, history } = await this.getStorage(["tabs", "history"]);
    return new ClosedTabsHistory(tabs ?? {}, history ?? {});
  }

  updateClosedTabHistory(closedTabHistory: ClosedTabsHistory) {
    this.updateStorage({
      tabs: closedTabHistory.tabs,
      history: closedTabHistory.history,
    });
  }

  async getActivatedTabs(): Promise<ActivatedTabs> {
    const activatedTabs = (await this.get("activatedTabs")) ?? {};
    return new ActivatedTabs(activatedTabs);
  }

  updateActivatedTabs(activatedTabs: ActivatedTabs) {
    this.updateStorage({ activatedTabs: activatedTabs.value });
  }

  async getOutdatedTabs(): Promise<OutdatedTabs> {
    const outdatedTabs = (await this.get("outdatedTabs")) ?? {};
    return new OutdatedTabs(outdatedTabs);
  }

  async updateOutdatedTabs(outdatedTabs: OutdatedTabs) {
    this.updateStorage({ outdatedTabs: outdatedTabs.value });
  }
}
