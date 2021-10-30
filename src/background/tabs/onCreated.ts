import { recoverAlarms } from "background/core/evacuation";
import { expireInactiveTab } from "background/core/lifetime";
import { loadOptions } from "storage/sync";
import {
  getClosedTabHistory,
  getOutdatedTabs,
  updateClosedTabHistory,
} from "storage/local";
import type { Async } from "types";
import { log } from "utils";
import { browser } from "webextension-polyfill-ts";

type OnCreated = Parameters<typeof chrome.tabs.onCreated.addListener>[0];
type OnCreatedAsync = Async<OnCreated>;

export const handleTabsOnCreated: OnCreatedAsync = async (tab) => {
  log("onCreated", tab);
  const [history, minTabs, tabs, outdatedTabs] = await Promise.all([
    getClosedTabHistory(),
    loadOptions("minTabs"),
    browser.tabs.query({ windowType: "normal", windowId: tab.windowId }),
    getOutdatedTabs(),
  ]);
  updateClosedTabHistory(history.createTab(tab));
  if (tabs.length > minTabs) {
    const lastTabId = outdatedTabs.getLastTabId(tab.windowId);
    if (lastTabId) {
      await chrome.tabs.remove(lastTabId);
    }
    await recoverAlarms(tab.windowId);
  }
  if (!tab.active) {
    await expireInactiveTab(tab, Date.now());
  }
};
