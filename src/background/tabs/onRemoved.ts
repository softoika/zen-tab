import { evacuateAlarms } from "background/core/evacuation";
import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
} from "storage/local";
import type { Async } from "types";
import { log } from "utils";
import { browser } from "webextension-polyfill-ts";

type OnRemoved = Parameters<typeof chrome.tabs.onRemoved["addListener"]>[0];
type OnRemovedAsync = Async<OnRemoved>;

/**
 * Post-processing when a tab is removed.
 * If a tab is closed, the history of closed tabs must be updated.
 * And the mappings for tab lifetime (ActiveTabs and OutdatedTabs) also must be updated for consistency.
 */
export const handleTabsOnRemoved: OnRemovedAsync = async (
  tabId,
  { windowId }
) => {
  log("onRemoved", tabId);
  browser.alarms.clear(`${tabId}`);
  const [activatedTabs, outdatedTabs, history] = await Promise.all([
    getActivatedTabs(),
    getOutdatedTabs(),
    getClosedTabHistory(),
  ]);
  updateClosedTabHistory(history.closeTab(tabId, windowId));
  updateActivatedTabs(activatedTabs.remove(tabId, windowId));
  updateOutdatedTabs(outdatedTabs.remove(tabId, windowId));

  // If the number of the tabs with the windowId is small (<= minTabs), the alarms are evacuated.
  await evacuateAlarms(windowId);
};
