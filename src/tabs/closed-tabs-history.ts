import type { ClosedTab, TabStorage } from "storage/types";
import type { NotNull, Tab, TabId, WindowId } from "types";

export class ClosedTabsHistory {
  constructor(
    private _tabs: NotNull<TabStorage["tabs"]>,
    private _history: NotNull<TabStorage["history"]>
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
