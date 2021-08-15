import { recoverAlarms } from "background/core/evacuation";
import { loadOptions } from "storage/options";
import {
  getClosedTabHistory,
  getOutdatedTabs,
  updateClosedTabHistory,
} from "storage/tabs";
import type { Async } from "types";
import { log } from "utils";
import { browser } from "webextension-polyfill-ts";

type OnCreated = Parameters<typeof chrome.tabs.onCreated.addListener>[0];
type OnCreatedAsync = Async<OnCreated>;

export const handleTabsOnCreated: OnCreatedAsync = async (tab) => {
  log("onCreated", tab);
  const history = await getClosedTabHistory();
  updateClosedTabHistory(history.createTab(tab));
  const [minTabs, tabs, outdatedTabs] = await Promise.all([
    loadOptions("minTabs"),
    browser.tabs.query({ windowType: "normal", windowId: tab.windowId }),
    getOutdatedTabs(),
  ]);
  const lastTabId = outdatedTabs.getLastTabId(tab.windowId);
  if (tabs.length > minTabs && lastTabId) {
    chrome.tabs.remove(lastTabId);
  }
  if (tabs.length > minTabs) {
    await recoverAlarms(tab.windowId);
  }
};
