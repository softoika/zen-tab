import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { getOptions, initOptions } from "./storage/options";
import { TabStorageService } from "./tab-storage-service";

const tabStorageService = new TabStorageService(browser.storage.local);
const lifeLimit = new LifeLimit(tabStorageService, browser.alarms);

chrome.tabs.onCreated.addListener(async (tab) => {
  console.log("onCreated", tab);
  tabStorageService.add(tab);
  const [minTabs, tabs, outdatedTabs] = await Promise.all([
    getOptions("minTabs"),
    browser.tabs.query({ windowType: "normal", windowId: tab.windowId }),
    tabStorageService.getOutdatedTabs(),
  ]);
  const lastTabId = outdatedTabs.getLastTabId(tab.windowId);
  if (tabs.length > minTabs && lastTabId) {
    chrome.tabs.remove(lastTabId);
  }
});

chrome.tabs.onActivated.addListener(async (tab) => {
  const baseLimit = await getOptions("baseLimit");
  lifeLimit.expireLastTab(tab, dayjs().valueOf() + baseLimit);
  const outdatedTabs = await tabStorageService.getOutdatedTabs();
  tabStorageService.updateOutdatedTabs(
    outdatedTabs.remove(tab.tabId, tab.windowId)
  );
  console.log("onActivated", tab);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    tabStorageService.update(tab);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, { windowId }) => {
  console.log("onRemoved", tabId);
  chrome.alarms.clear(`${tabId}`);
  tabStorageService.remove(tabId);
  const [activatedTabs, outdatedTabs] = await Promise.all([
    tabStorageService.getActivatedTabs(),
    tabStorageService.getOutdatedTabs(),
  ]);
  tabStorageService.updateActivatedTabs(activatedTabs.remove(tabId, windowId));
  tabStorageService.updateOutdatedTabs(outdatedTabs.remove(tabId, windowId));
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
    const outdatedTabs = await tabStorageService.getOutdatedTabs();
    tabStorageService.updateOutdatedTabs(outdatedTabs.push(tab));
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
