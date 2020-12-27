import type { Storage } from "webextension-polyfill-ts";
import type { NotNull, Tab } from "./types";

type TabId = Tab["id"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

type TabStack = { id: NotNull<TabId> }[];

interface TabStorage {
  /**
   * Stacks of last activated tabs in each window.
   * The tab on the stack will start an alarm on the next activation.
   */
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

  async getLastTabId(windowId: Tab["windowId"]): Promise<TabId> {
    if (!windowId) {
      return undefined;
    }
    const stack = await this.getTabStackByWindowId(windowId);
    return stack?.[0]?.id;
  }

  async createLastTabStack(tabs: Tab[]) {
    let lastTabStack: { [windowId: number]: TabStack } = {};
    tabs.forEach((tab) => {
      if (typeof tab.windowId !== "number" || typeof tab.id !== "number") {
        return;
      }
      let stack = lastTabStack[tab.windowId] ?? [];
      stack = tab.active
        ? [{ id: tab.id }, ...stack]
        : [...stack, { id: tab.id }];
      lastTabStack = {
        ...lastTabStack,
        [tab.windowId]: stack,
      };
    });
    this.localStorage.set({ lastTabStack });
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

  async removeTabFromStack(
    tabId: NotNull<TabId>,
    windowId: NotNull<Tab["windowId"]>
  ) {
    let lastTabStack = await this.getTabStack();
    let stack = lastTabStack[windowId] ?? [];
    stack = stack.filter(({ id }) => id !== tabId);
    lastTabStack = {
      ...lastTabStack,
      [windowId]: [...stack],
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
