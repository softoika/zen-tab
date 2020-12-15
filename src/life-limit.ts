import type { Alarms } from "webextension-polyfill-ts";
import type { TabStorageService } from "./tab-storage-service";
import type { Tab } from "./types";

export class LifeLimit {
  constructor(
    private tabStorageService: TabStorageService,
    private alarms: Alarms.Static
  ) {}

  /**
   * Set alarm for a last activated tab.
   * @param newTabId
   * @param when Unix timestamps (milliseconds)
   */
  async expireLastTab(newTabId: Tab["id"], when: number) {
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
}
