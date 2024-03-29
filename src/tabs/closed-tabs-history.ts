import type { ClosedTab, LocalStorage } from "storage/types";
import type { NotNull, Tab, TabId, WindowId } from "types";

export class ClosedTabsHistory {
  constructor(
    private _tabs: NotNull<LocalStorage["tabs"]>,
    private _history: NotNull<LocalStorage["history"]>
  ) {}

  get tabs() {
    return this._tabs;
  }

  get history() {
    return this._history;
  }

  createTab(tab: Tab): ClosedTabsHistory {
    if (!tab.id) {
      return this;
    }
    if (!tab.windowId) {
      return this;
    }
    const tabs = this.getTabs(tab.windowId);
    this._tabs = {
      ...this._tabs,
      [tab.windowId]: [...tabs, tab],
    };
    return this;
  }

  createTabs(tabs: Tab[]): ClosedTabsHistory {
    if (tabs.length === 0) {
      return this;
    }
    // make this class work correctly even if it becomes immutable.
    let self = this.createTab(tabs[0]);
    for (let i = 1; i < tabs.length; i++) {
      self = self.createTab(tabs[i]);
    }
    return self;
  }

  updateTab(newTab: Tab): ClosedTabsHistory {
    if (!newTab.id) {
      return this;
    }
    if (!newTab.windowId) {
      return this;
    }
    const tabs = this.getTabs(newTab.windowId).map((tab) =>
      newTab.id === tab.id ? newTab : tab
    );
    this._tabs = { ...this._tabs, [newTab.windowId]: tabs };
    return this;
  }

  closeTab(tabId: TabId, windowId: WindowId): ClosedTabsHistory {
    const tabs = this.getTabs(windowId);
    const history = this.getHistory(windowId);
    const tab = tabs.find((t) => t.id === tabId);

    if (!tab) {
      return this;
    }

    this._tabs = {
      ...this._tabs,
      [windowId]: tabs.filter((t) => t.id !== tabId),
    };

    this._history = {
      ...this._history,
      [windowId]: [
        {
          id: tab.id,
          title: tab.title,
          url: tab.url ?? tab.pendingUrl,
          favIconUrl: tab.favIconUrl,
        },
        ...history,
      ],
    };

    return this;
  }

  private getTabs(windowId: WindowId): readonly Tab[] {
    return this._tabs[windowId] ?? [];
  }

  private getHistory(windowId: WindowId): readonly ClosedTab[] {
    return this._history[windowId] ?? [];
  }
}
