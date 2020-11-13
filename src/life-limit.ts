import type { Alarms } from "webextension-polyfill-ts";
import { TabId, TabStorageService } from "./tab-storage-service";

export class LifeLimit {
  constructor(
    private tabStorageService: TabStorageService,
    private alarms: Alarms.Static
  ) {}

  /**
   * @param tabId
   * @param when Unix timestamps (milliseconds)
   */
  async countDown(tabId: TabId, when: number) {
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
