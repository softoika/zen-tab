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
    const lastTab = await this.tabStorageService.getLastTab();
    if (lastTab?.id) {
      this.alarms.create(`${lastTab.id}`, { when });
    }
    this.tabStorageService.upateLastTab(newTab);
  }

  /**
   * Set alarms for all inactive tabs
   */
  async expireInactiveTabs(inactiveTabs: Tab[], when: When) {
    this.alarms.clear();
    if (inactiveTabs.length <= 0) {
      return;
    }

    const delayUnit = 1000;
    let totalDelay = 0;
    inactiveTabs
      .map((tab) => tab.id)
      .forEach((tabId) => {
        if (!tabId) {
          return;
        }
        // Must delay alarms in each tab because it is not able to close tabs syncronously.
        this.alarms.create(`${tabId}`, { when: when + totalDelay });
        totalDelay += delayUnit;
      });

    const lastTab = inactiveTabs?.[inactiveTabs.length - 1];
    if (lastTab?.id && lastTab?.windowId) {
      this.tabStorageService.upateLastTab({
        tabId: lastTab.id,
        windowId: lastTab.windowId,
      });
    }
  }
}
