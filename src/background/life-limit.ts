import type { Alarms } from "webextension-polyfill-ts";
import { createActivatedTabs } from "tabs";
import { getActivatedTabs, updateActivatedTabs } from "storage/tabs";
import type { Tab } from "types";

/**
 * Unix timestamps (milliseconds)
 */
type When = number;

export class LifeLimit {
  constructor(private alarms: Alarms.Static) {}

  /**
   * Set alarm for a last activated tab.
   */
  async expireLastTab(newTab: chrome.tabs.TabActiveInfo, when: When) {
    if (!newTab?.tabId) {
      return;
    }
    await this.alarms.clear(`${newTab.tabId}`);
    const activatedTabs = await getActivatedTabs();
    const lastTabId = activatedTabs.getLastTabId(newTab.windowId);
    if (lastTabId) {
      this.alarms.create(`${lastTabId}`, { when });
    }
    updateActivatedTabs(activatedTabs.push(newTab.tabId, newTab.windowId));
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

    updateActivatedTabs(createActivatedTabs(tabs));
  }
}
