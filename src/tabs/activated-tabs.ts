import type { LocalStorage } from "storage/types";
import type { NotNull, Tab, TabId, WindowId } from "types";

export class ActivatedTabs {
  constructor(private activatedTabs: NotNull<LocalStorage["activatedTabs"]>) {}

  get value() {
    return this.activatedTabs;
  }

  getLastTabId(windowId: WindowId): TabId | undefined {
    const stack = this.activatedTabs[windowId] ?? [];
    return stack?.[0]?.id;
  }

  /**
   * Push the tab on the stack of the most recently activated tabs in each window.
   * If the tab is in the stack, move it to the top of the stack.
   */
  push(tabId: TabId, windowId: WindowId): ActivatedTabs {
    let stack = this.activatedTabs[windowId] ?? [];
    stack = stack.filter(({ id }) => id !== tabId);
    this.activatedTabs = {
      ...this.activatedTabs,
      [windowId]: [{ id: tabId }, ...stack],
    };
    return this;
  }

  remove(tabId: TabId, windowId: WindowId): ActivatedTabs {
    let stack = this.activatedTabs[windowId] ?? [];
    stack = stack.filter(({ id }) => id !== tabId);
    this.activatedTabs = {
      ...this.activatedTabs,
      [windowId]: stack,
    };
    return this;
  }
}

export function createActivatedTabs(tabs: Tab[]): ActivatedTabs {
  const activatedTabs = new ActivatedTabs({});
  [...tabs]
    // push in order from inactive tabs
    .sort((a, b) => {
      if (a.active && !b.active) {
        return 1;
      }
      if (!a.active && b.active) {
        return -1;
      }
      return 0;
    })
    .forEach((tab) => {
      if (typeof tab.windowId !== "number" || typeof tab.id !== "number") {
        return;
      }
      activatedTabs.push(tab.id, tab.windowId);
    });
  return activatedTabs;
}
