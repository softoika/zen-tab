import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { TabStorageService } from "./tab-storage-service";

const tabStorageService = new TabStorageService(browser.storage.local);

const countStart = async (tabId: number) => {
  chrome.alarms.clear(`${tabId}`);
  const lastTabId = await tabStorageService.getLastTabId();
  if (lastTabId != null) {
    console.log(`${lastTabId} count start!`);
    const when = dayjs().add(30, "second").valueOf();
    chrome.alarms.create(`${lastTabId}`, { when });
  }
  tabStorageService.upateLastTabId(tabId);
};

chrome.tabs.onCreated.addListener((tab) => {
  console.log("onCreated", tab);
  tabStorageService.add(tab);
});

chrome.tabs.onActivated.addListener((tab) => {
  countStart(tab.tabId);
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

chrome.runtime.onInstalled.addListener((details) => {
  console.log("onInstalled", details);
  chrome.storage.local.clear();
  chrome.alarms.clear();
});

chrome.runtime.onSuspend.addListener(() => {
  console.log("onSuspend");
  chrome.storage.local.clear();
  chrome.alarms.clear();
});
