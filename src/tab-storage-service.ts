import type { Storage } from "webextension-polyfill-ts";
import type { TabStorage as ActivatedTabsStorage } from "./activated-tabs";
import {
  OutdatedTabs,
  TabStorage as OutdatedTabsStorage,
} from "./outdated-tabs";
import { ActivatedTabs } from "./activated-tabs";
import type { NotNull, Tab } from "./types";

type TabId = Tab["id"];
type WindowId = Tab["windowId"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

type TabIds = { id: NotNull<TabId> }[];

type TabStorage = {
  tabs?: Tab[];
  history?: ClosedTab[];
} & ActivatedTabsStorage &
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

  async getActivatedTabs(): Promise<ActivatedTabs> {
    const activatedTabs = (await this.get("activatedTabs")) ?? {};
    return new ActivatedTabs(activatedTabs);
  }

  updateActivatedTabs(activatedTabs: ActivatedTabs) {
    this.localStorage.set({ activatedTabs: activatedTabs.value });
  }

  async getOutdatedTabs(): Promise<OutdatedTabs> {
    const outdatedTabs = (await this.get("outdatedTabs")) ?? {};
    return new OutdatedTabs(outdatedTabs);
  }

  async updateOutdatedTabs(outdatedTabs: OutdatedTabs) {
    this.localStorage.set({ outdatedTabs: outdatedTabs.value });
  }
}
