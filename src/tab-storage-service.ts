import type { Storage } from "webextension-polyfill-ts";
import type { TabStorage as ActivatedTabsStorage } from "./activated-tabs";
import { ActivatedTabs } from "./activated-tabs";
import type { NotNull, Tab } from "./types";

type TabId = Tab["id"];
type WindowId = Tab["windowId"];

type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

type TabIds = { id: NotNull<TabId> }[];

type TabStorage = {
  /**
   * Lists of outdated tabs in each window.
   * They are no longer closed by the alarms because of Options.minTabs.
   * So they can be thought of as having a minus limit time.
   */
  outdatedTabs?: { [_ in NotNull<WindowId>]: TabIds };
  tabs?: Tab[];
  history?: ClosedTab[];
} & ActivatedTabsStorage;

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
    let { activatedTabs }: ActivatedTabsStorage = await this.localStorage.get(
      "activatedTabs"
    );
    if (!activatedTabs) {
      activatedTabs = {};
    }
    return new ActivatedTabs(activatedTabs);
  }

  updateActivatedTabs(activatedTabs: ActivatedTabs) {
    this.localStorage.set({ activatedTabs: activatedTabs.value });
  }

  async pushOutdatedTab(tab: Tab) {
    if (!tab.id) {
      return;
    }
    if (!tab.windowId) {
      return;
    }
    let {
      outdatedTabs,
    }: Pick<TabStorage, "outdatedTabs"> = await this.localStorage.get(
      "outdatedTabs"
    );
    if (!outdatedTabs) {
      outdatedTabs = {};
    }
    let tabs = outdatedTabs[tab.windowId] ?? [];
    tabs = tabs.filter(({ id }) => id !== tab.id);
    outdatedTabs = {
      ...outdatedTabs,
      [tab.windowId]: [...tabs, { id: tab.id }],
    };
    this.localStorage.set({ outdatedTabs });
  }

  async getOutdatedTabs(windowId: NotNull<WindowId>): Promise<TabIds> {
    let {
      outdatedTabs,
    }: Pick<TabStorage, "outdatedTabs"> = await this.localStorage.get(
      "outdatedTabs"
    );
    if (!outdatedTabs) {
      outdatedTabs = {};
    }
    return outdatedTabs[windowId] ?? [];
  }

  async removeFromOutdatedTabs(
    tabId: NotNull<TabId>,
    windowId: NotNull<WindowId>
  ) {
    let {
      outdatedTabs,
    }: Pick<TabStorage, "outdatedTabs"> = await this.localStorage.get(
      "outdatedTabs"
    );
    if (!outdatedTabs) {
      outdatedTabs = {};
    }
    let tabs = outdatedTabs[windowId] ?? [];
    tabs = tabs.filter(({ id }) => id !== tabId);
    outdatedTabs = {
      ...outdatedTabs,
      [windowId]: tabs,
    };
    this.localStorage.set({ outdatedTabs });
  }
}
