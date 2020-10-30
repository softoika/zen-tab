import type { Storage } from "webextension-polyfill-ts";

type TabId = chrome.tabs.Tab["id"];

type ClosedTab = Pick<chrome.tabs.Tab, "title" | "url" | "favIconUrl">;

interface TabStorage {
  lastTabId?: TabId;
  tabs?: chrome.tabs.Tab[];
  history?: ClosedTab[];
}

export class TabStorageService {
  constructor(private localStorage: Storage.LocalStorageArea) {}

  async add(tab: chrome.tabs.Tab) {
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
}
