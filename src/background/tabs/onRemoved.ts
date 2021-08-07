import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
} from "storage/tabs";
import { log } from "utils";
import { browser } from "webextension-polyfill-ts";

type OnRemovedBase = Parameters<typeof chrome.tabs.onRemoved["addListener"]>[0];
type Return = ReturnType<OnRemovedBase>;
type Params = Parameters<OnRemovedBase>;
type OnRemovedAsync = (...params: Params) => Promise<Return>;

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
  const history = await getClosedTabHistory();
  updateClosedTabHistory(history.closeTab(tabId, windowId));
  const [activatedTabs, outdatedTabs] = await Promise.all([
    getActivatedTabs(),
    getOutdatedTabs(),
  ]);
  updateActivatedTabs(activatedTabs.remove(tabId, windowId));
  updateOutdatedTabs(outdatedTabs.remove(tabId, windowId));
};
