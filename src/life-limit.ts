import type { Alarms } from "webextension-polyfill-ts";
import type { TabStorageService } from "./tab-storage-service";
import type { Tab } from "./types";

/**
 * Unix timestamps (milliseconds)
 */
type When = number;

export class LifeLimit {
  constructor(
    private tabStorageService: TabStorageService,
    private alarms: Alarms.Static
  ) {}

  /**
   * Set alarm for a last activated tab.
   */
  async expireLastTab(newTab: chrome.tabs.TabActiveInfo, when: When) {
    if (!newTab?.tabId) {
      return;
    }
    await this.alarms.clear(`${newTab.tabId}`);
    const lastTabId = await this.tabStorageService.getLastTabId(
      newTab.windowId
    );
    if (lastTabId) {
      this.alarms.create(`${lastTabId}`, { when });
    }
    this.tabStorageService.pushLastTab(newTab);
  }

  /**
   * Set alarms for all inactive tabs
   */
  async expireInactiveTabs(tabs: Tab[], when: When) {
    this.alarms.clear();
    if (tabs.length <= 0) {
      return;
    }

    const delayUnit = 1000;
    let totalDelay = 0;
    tabs
      .filter((tab) => !tab.active)
      .map((tab) => tab.id)
      .forEach((tabId) => {
        if (!tabId) {
          return;
        }
        // Must delay alarms in each tab because it is not able to close tabs syncronously.
        this.alarms.create(`${tabId}`, { when: when + totalDelay });
        totalDelay += delayUnit;
      });

    // active -> inactive order
    tabs
      .sort((a, b) => {
        if (!a.active && b.active) {
          return 1;
        }
        if (a.active && !b.active) {
          return -1;
        }
        return 0;
      })
      .forEach((tab) => {
        if (!tab.id || !tab.windowId) {
          return;
        }
        this.tabStorageService.pushLastTab({
          tabId: tab.id,
          windowId: tab.windowId,
        });
      });
  }
}
