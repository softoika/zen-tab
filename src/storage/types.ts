import type { Tab, TabId, WindowId } from "types";
import type { Alarms } from "webextension-polyfill-ts";

export type ClosedTab = Pick<Tab, "id" | "title" | "url" | "favIconUrl">;

export type EvacuatedAlarm = Alarms.Alarm & {
  /**
   * Time left of the alarm for re-calculating its scheduledTime.
   */
  timeLeft: number;
};

export interface LocalStorage {
  /**
   * The stored tab objects that are currently opened.
   * This is necessary because the tab object cannot be retrieved
   * when closing a tab.
   */
  tabs?: { readonly [_ in WindowId]: readonly Tab[] };

  tabsMap?: {
    readonly [_ in TabId]: {
      /**
       * A timestamp the tab was inactivated.
       * When the tab is activated, its value is undefined.
       */
      lastInactivated?: number;

      /**
       * Timestamp when the tab is closed.
       * When the tab is activated, its value is undefined.
       */
      scheduledTime?: number;
    };
  };

  history?: { readonly [_ in WindowId]: readonly ClosedTab[] };

  /**
   * Stacks of last activated tabs in each window.
   * The tab on the stack will start an alarm on the next activation.
   * The key is the windowId(number). Because type aliases cannot be specified
   * in index signatures, the `in` keyword is used instead.
   */
  activatedTabs?: {
    readonly [_ in WindowId]: readonly { id: TabId }[];
  };

  /**
   * Lists of outdated tabs in each window.
   * They are no longer closed by the alarms because of Options.minTabs.
   * So they can be thought of as having a minus limit time.
   * The key is the windowId(number). Because type aliases cannot be specified
   * in index signatures, the `in` keyword is used instead.
   */
  outdatedTabs?: {
    readonly [_ in WindowId]: readonly { id: TabId }[];
  };

  /**
   * Alarms that are temporarily evacuated when a computer is locked.
   * This is necessary because if it is locked, the alarms will not work properly.
   * This is the value for all windows.
   */
  evacuatedAlarms?: EvacuatedAlarm[];

  /**
   * The lastEvacuatedAt and evacuatedAlarms map for each window.
   */
  evacuationMap?: {
    readonly [_ in WindowId]?: {
      evacuatedAlarms: EvacuatedAlarm[];
    };
  };
}

export interface SyncStorage {
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

  /**
   * If true, the pinned tab isn't counted down and closed automatically.
   */
  protectPinnedTabs: boolean;
}
