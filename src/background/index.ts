import dayjs from "dayjs";

import { browser } from "webextension-polyfill-ts";
import { loadOptions, initOptions } from "storage/options";
import {
  getClosedTabHistory,
  getOutdatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
  updateStorage,
} from "storage/tabs";
import {
  expireInactiveTabs,
  expireLastTab,
  removeTabOnAlarm,
} from "./lifetime";
import { log } from "utils";
import { protectAlarmsOnChangeIdleState } from "./idle";
import { ClosedTabsHistory } from "tabs";
import { handleTabsOnRemoved } from "./tabs/onRemoved";

chrome.tabs.onCreated.addListener(async (tab) => {
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
});

chrome.tabs.onActivated.addListener(async (tab) => {
  expireLastTab(tab, dayjs().valueOf());
  const outdatedTabs = await getOutdatedTabs();
  updateOutdatedTabs(outdatedTabs.remove(tab.tabId, tab.windowId));
  log("onActivated", tab);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const history = await getClosedTabHistory();
    updateClosedTabHistory(history.updateTab(tab));
  }
});

chrome.tabs.onRemoved.addListener(handleTabsOnRemoved);

chrome.alarms.onAlarm.addListener((alarm) => removeTabOnAlarm(alarm));

chrome.storage.onChanged.addListener((changes) => {
  log("debug storage: ", changes);
});

chrome.idle.onStateChanged.addListener((state) =>
  protectAlarmsOnChangeIdleState(state)
);

const onInitExtension = async () => {
  const tabs = await browser.tabs.query({
    windowType: "normal",
  });
  await initOptions(process.env.NODE_ENV);
  expireInactiveTabs(tabs, dayjs().valueOf());
  const history = await getClosedTabHistory().then((h) => h.history);
  log(history);
  const closedTabHistory = new ClosedTabsHistory({}, history).createTabs(tabs);
  updateStorage({ activatedTabs: {}, outdatedTabs: {} });
  updateClosedTabHistory(closedTabHistory);
};

chrome.runtime.onInstalled.addListener((details) => {
  log("onInstalled", details);
  onInitExtension();
});

chrome.management.onEnabled.addListener((info) => {
  log("onEnabled", info);
  if (chrome.runtime.id === info.id) {
    onInitExtension();
  }
});
