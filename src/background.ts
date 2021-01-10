import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { getOptions, initOptions } from "./storage/options";
import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
} from "./storage/tabs";

const lifeLimit = new LifeLimit(browser.alarms);

chrome.tabs.onCreated.addListener(async (tab) => {
  console.log("onCreated", tab);
  const history = await getClosedTabHistory();
  updateClosedTabHistory(history.createTab(tab));
  const [minTabs, tabs, outdatedTabs] = await Promise.all([
    getOptions("minTabs"),
    browser.tabs.query({ windowType: "normal", windowId: tab.windowId }),
    getOutdatedTabs(),
  ]);
  const lastTabId = outdatedTabs.getLastTabId(tab.windowId);
  if (tabs.length > minTabs && lastTabId) {
    chrome.tabs.remove(lastTabId);
  }
});

chrome.tabs.onActivated.addListener(async (tab) => {
  const baseLimit = await getOptions("baseLimit");
  lifeLimit.expireLastTab(tab, dayjs().valueOf() + baseLimit);
  const outdatedTabs = await getOutdatedTabs();
  updateOutdatedTabs(outdatedTabs.remove(tab.tabId, tab.windowId));
  console.log("onActivated", tab);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const history = await getClosedTabHistory();
    updateClosedTabHistory(history.updateTab(tab));
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, { windowId }) => {
  console.log("onRemoved", tabId);
  chrome.alarms.clear(`${tabId}`);
  const history = await getClosedTabHistory();
  updateClosedTabHistory(history.closeTab(tabId, windowId));
  const [activatedTabs, outdatedTabs] = await Promise.all([
    getActivatedTabs(),
    getOutdatedTabs(),
  ]);
  updateActivatedTabs(activatedTabs.remove(tabId, windowId));
  updateOutdatedTabs(outdatedTabs.remove(tabId, windowId));
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("onAlarm", alarm);
  const tabId = +alarm.name;
  const tab = await browser.tabs.get(tabId);
  if (!tab) {
    return;
  }
  const tabs = await browser.tabs.query({
    windowType: "normal",
    windowId: tab.windowId,
  });
  const minTabs = await getOptions("minTabs");
  if (tabs.length > minTabs) {
    console.log(`Removed ${tabId}`);
    chrome.tabs.remove(tabId);
  } else {
    const outdatedTabs = await getOutdatedTabs();
    updateOutdatedTabs(outdatedTabs.push(tab));
  }
});

// chrome.storage.onChanged.addListener((changes) => {
//   console.log("debug storage: ", changes);
// });

const onInitExtension = async () => {
  const tabs = await browser.tabs.query({
    windowType: "normal",
  });
  await initOptions(process.env.NODE_ENV);
  const baseLimit = await getOptions("baseLimit");
  lifeLimit.expireInactiveTabs(tabs, dayjs().valueOf() + baseLimit);
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log("onInstalled", details);
  onInitExtension();
});

chrome.management.onEnabled.addListener((info) => {
  console.log("onEnabled", info);
  if (chrome.runtime.id === info.id) {
    onInitExtension();
  }
});
