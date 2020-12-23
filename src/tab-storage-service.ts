import type { Storage } from "webextension-polyfill-ts";
import type { NotNull, Tab } from "./types";

type TabId = Tab["id"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

type LastTab = Pick<Tab, "id" | "windowId">;

type TabStack = { id: TabId }[];

interface TabStorage {
  lastTab?: LastTab;
  lastTabStack?: { [windowId: number]: TabStack };
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

  async getLastTabId(windowId: Tab["windowId"]): Promise<TabId> {
    if (!windowId) {
      return undefined;
    }
    const stack = await this.getTabStackByWindowId(windowId);
    return stack?.[0]?.id;
  }

  /**
   * Push the tab on the stack of the most recently activated tabs in each window.
   * If the tab is in the stack, move it to the top of the stack.
   */
  async pushLastTab(tab: chrome.tabs.TabActiveInfo) {
    let lastTabStack = await this.getTabStack();
    let stack = lastTabStack[tab.windowId] ?? [];
    stack = stack.filter(({ id }) => id !== tab.tabId);
    lastTabStack = {
      ...lastTabStack,
      [tab.windowId]: [{ id: tab.tabId }, ...stack],
    };
    this.localStorage.set({ lastTabStack });
  }

  private async getTabStackByWindowId(
    windowId: NotNull<Tab["windowId"]>
  ): Promise<TabStack> {
    const lastTabStack = await this.getTabStack();
    return lastTabStack[windowId] ?? [];
  }

  private async getTabStack(): Promise<NotNull<TabStorage["lastTabStack"]>> {
    const {
      lastTabStack,
    }: Pick<TabStorage, "lastTabStack"> = await this.localStorage.get(
      "lastTabStack"
    );
    return lastTabStack ?? {};
  }
}
