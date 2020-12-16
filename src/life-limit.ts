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
  async expireLastTab(newTabId: Tab["id"], when: When) {
    if (!newTabId) {
      return;
    }
    await this.alarms.clear(`${newTabId}`);
    const lastTabId = await this.tabStorageService.getLastTabId();
    if (lastTabId) {
      this.alarms.create(`${lastTabId}`, { when });
    }
    this.tabStorageService.upateLastTabId(newTabId);
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

    const lastTabId = inactiveTabs?.[inactiveTabs.length - 1]?.id;
    if (lastTabId) {
      this.tabStorageService.upateLastTabId(lastTabId);
    }
  }
}
