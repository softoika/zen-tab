import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { TabStorageService } from "./tab-storage-service";

const tabStorageService = new TabStorageService(browser.storage.local);
const lifeLimit = new LifeLimit(tabStorageService, browser.alarms);

chrome.tabs.onCreated.addListener((tab) => {
  console.log("onCreated", tab);
  tabStorageService.add(tab);
});

chrome.tabs.onActivated.addListener((tab) => {
  lifeLimit.countDown(tab.tabId, dayjs().add(30, "second").valueOf());
  console.log("onActivated", tab);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // console.log("onUpdated", tab);
    tabStorageService.update(tab);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log("onRemoved", tabId);
  chrome.alarms.clear(`${tabId}`);
  tabStorageService.remove(tabId);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("onAlarm", alarm);
  const tabId = +alarm.name;
  const tab = await browser.tabs.get(tabId);
  if (tab) {
    chrome.tabs.remove(tabId);
  }
});

// chrome.storage.onChanged.addListener((changes) => {
//   console.log("debug storage: ", changes);
// });

const onInitExtension = async () => {
  const tabs = await browser.tabs.query({ windowType: "normal" });
  tabStorageService.updateAllTabs(tabs);
  chrome.alarms.clear();
  // TODO: Set alarms for all tabs
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
