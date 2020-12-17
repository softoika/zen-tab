import type { Storage } from "webextension-polyfill-ts";
import type { Tab } from "./types";

type TabId = Tab["id"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

type LastTab = Pick<Tab, "id" | "windowId">;

interface TabStorage {
  lastTab?: LastTab;
  tabs?: Tab[];
  history?: ClosedTab[];
}

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

  async add(tab: Tab) {
    const storage: Pick<TabStorage, "tabs"> = await this.localStorage.get(
      "tabs"
    );
    const tabs = storage.tabs ?? [];
    tabs.push(tab);
    this.localStorage.set({ tabs });
  }

  async remove(tabId: TabId) {
    const keys = ["tabs", "history"] as const;
    const storage: Pick<
      TabStorage,
      typeof keys[number]
    > = await this.localStorage.get(keys);

    let tabs = storage.tabs ?? [];
    let history = storage.history ?? [];

    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) {
      return;
    }

    tabs = tabs.filter((t) => t.id !== tabId);
    history = [
      {
        title: tab.title,
        url: tab.url ?? tab.pendingUrl,
        favIconUrl: tab.favIconUrl,
      },
      ...history,
    ];
    this.localStorage.set({ tabs, history });
  }

  async update(newTab: Tab) {
    if (!newTab.id) {
      return;
    }
    const storage: Pick<TabStorage, "tabs"> = await this.localStorage.get(
      "tabs"
    );
    const tabs =
      storage.tabs?.map((tab) => (newTab.id === tab.id ? newTab : tab)) ?? [];
    this.localStorage.set({ tabs });
  }

  updateAllTabs(tabs: Tab[]) {
    this.localStorage.set({ tabs });
  }

  async getLastTab(): Promise<LastTab> {
    return this.localStorage.get("lastTab").then((storage) => storage.lastTab);
  }

  upateLastTab(tab: chrome.tabs.TabActiveInfo) {
    if (!tab?.tabId) {
      return;
    }
    this.localStorage.set({
      lastTab: { id: tab.tabId, windowId: tab.windowId },
    });
  }
}
