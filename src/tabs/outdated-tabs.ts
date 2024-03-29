import type { LocalStorage } from "storage/types";
import type { NotNull, Tab, TabId, WindowId } from "types";

export class OutdatedTabs {
  constructor(private outdatedTabs: NotNull<LocalStorage["outdatedTabs"]>) {}

  get value() {
    return this.outdatedTabs;
  }

  getLastTabId(windowId: WindowId): TabId | undefined {
    const tabs = this.outdatedTabs[windowId];
    if (!tabs?.length) {
      return undefined;
    }
    return tabs?.[tabs.length - 1]?.id;
  }

  /**
   * Push a tab that cannot be removed by alarms to the outdated tabs list.
   * If the tab is in the list, move it to the last of the list.
   */
  push(tab: Tab): OutdatedTabs {
    if (!tab.id) {
      return this;
    }
    if (!tab.windowId) {
      return this;
    }
    let tabs = this.outdatedTabs[tab.windowId] ?? [];
    tabs = tabs.filter(({ id }) => id !== tab.id);
    this.outdatedTabs = {
      ...this.outdatedTabs,
      [tab.windowId]: [...tabs, { id: tab.id }],
    };
    return this;
  }

  remove(tabId: TabId, windowId: WindowId): OutdatedTabs {
    let tabs = this.outdatedTabs[windowId] ?? [];
    tabs = tabs.filter(({ id }) => id !== tabId);
    this.outdatedTabs = {
      ...this.outdatedTabs,
      [windowId]: tabs,
    };
    return this;
  }
}
