import type { NotNull, Tab } from "./types";

type TabId = Tab["id"];
type WindowId = Tab["windowId"];

export interface TabStorage {
  /**
   * Stacks of last activated tabs in each window.
   * The tab on the stack will start an alarm on the next activation.
   * The key is the windowId(number). Because type aliases cannot be specified
   * in index signatures, the `in` keyword is used instead.
   */
  activatedTabs?: {
    readonly [_ in NotNull<WindowId>]: readonly { id: NotNull<TabId> }[];
  };
}

export class ActivatedTabs {
  constructor(private activatedTabs: NotNull<TabStorage["activatedTabs"]>) {}

  get value() {
    return this.activatedTabs;
  }

  getLastTabId(windowId: NotNull<WindowId>): TabId {
    const stack = this.activatedTabs[windowId] ?? [];
    return stack?.[0]?.id;
  }

  /**
   * Push the tab on the stack of the most recently activated tabs in each window.
   * If the tab is in the stack, move it to the top of the stack.
   */
  push(tabId: NotNull<TabId>, windowId: NotNull<WindowId>): ActivatedTabs {
    let stack = this.activatedTabs[windowId] ?? [];
    stack = stack.filter(({ id }) => id !== tabId);
    this.activatedTabs = {
      ...this.activatedTabs,
      [windowId]: [{ id: tabId }, ...stack],
    };
    return this;
  }

  remove(tabId: NotNull<TabId>, windowId: NotNull<WindowId>): ActivatedTabs {
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
