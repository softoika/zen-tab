import type { NotNull, Tab } from "../types";

type TabId = Tab["id"];
type WindowId = Tab["windowId"];
export type ClosedTab = Pick<Tab, "title" | "url" | "favIconUrl">;

export interface TabStorage {
  tabs?: { readonly [_ in NotNull<WindowId>]: readonly Tab[] };
  history?: { readonly [_ in NotNull<WindowId>]: readonly ClosedTab[] };
  /**
   * Stacks of last activated tabs in each window.
   * The tab on the stack will start an alarm on the next activation.
   * The key is the windowId(number). Because type aliases cannot be specified
   * in index signatures, the `in` keyword is used instead.
   */
  activatedTabs?: {
    readonly [_ in NotNull<WindowId>]: readonly { id: NotNull<TabId> }[];
  };

  /**
   * Lists of outdated tabs in each window.
   * They are no longer closed by the alarms because of Options.minTabs.
   * So they can be thought of as having a minus limit time.
   * The key is the windowId(number). Because type aliases cannot be specified
   * in index signatures, the `in` keyword is used instead.
   */
  outdatedTabs?: {
    readonly [_ in NotNull<WindowId>]: readonly { id: NotNull<TabId> }[];
  };
}

export interface Options {
  /**
   * The mininum number that this extension can keep tabs.
   * The number of tabs can never be less than this number.
   * If there are more tabs than this, an oldest tab is closed until its number
   * is equal to minTabs.
   */
  minTabs: number;

  /**
   * Time limit for the tab to live if the number of tabs is more than minTabs.
   * The unit of this value is milliseconds.
   */
  baseLimit: number;
}
