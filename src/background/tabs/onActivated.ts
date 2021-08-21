import { expireLastTab } from "background/core/lifetime";
import { getOutdatedTabs, updateOutdatedTabs } from "storage/tabs";
import type { Async } from "types";
import { log } from "utils";

type OnActivated = Parameters<typeof chrome.tabs.onActivated.addListener>[0];
type OnActivatedAsync = Async<OnActivated>;

export const handleTabsOnActivated: OnActivatedAsync = async (tab) => {
  log("onActivated", tab);
  expireLastTab(tab, Date.now());
  const outdatedTabs = await getOutdatedTabs();
  updateOutdatedTabs(outdatedTabs.remove(tab.tabId, tab.windowId));
};
