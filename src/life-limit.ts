import type { Alarms } from "webextension-polyfill-ts";
import type { TabStorageService } from "./tab-storage-service";
import type { Tab } from "./types";

export class LifeLimit {
  constructor(
    private tabStorageService: TabStorageService,
    private alarms: Alarms.Static
  ) {}

  /**
   * @param tabId
   * @param when Unix timestamps (milliseconds)
   */
  async countDown(tabId: Tab["id"], when: number) {
    if (!tabId) {
      return;
    }
    await this.alarms.clear(`${tabId}`);
    const lastTabId = await this.tabStorageService.getLastTabId();
    if (lastTabId) {
      this.alarms.create(`${lastTabId}`, { when });
    }
    this.tabStorageService.upateLastTabId(tabId);
  }
}
