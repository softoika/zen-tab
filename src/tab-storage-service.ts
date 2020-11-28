import type { Storage } from "webextension-polyfill-ts";
import { Tab } from "./types";

type TabId = Tab["id"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

interface TabStorage {
  lastTabId?: TabId;
  tabs?: Tab[];
  history?: ClosedTab[];
}

export class TabStorageService {
  constructor(private localStorage: Storage.LocalStorageArea) {}

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

  async getLastTabId(): Promise<TabId> {
    return this.localStorage
      .get("lastTabId")
      .then((storage: Pick<TabStorage, "lastTabId">) => storage.lastTabId);
  }

  upateLastTabId(tabId: TabId) {
    if (!tabId) {
      return;
    }
    this.localStorage.set({ lastTabId: tabId });
  }
}
