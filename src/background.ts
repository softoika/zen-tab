import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";

const countStart = async (tabId: number) => {
  chrome.alarms.clear(`${tabId}`);
  const value = await browser.storage.local.get("lastTabId");
  if (value.lastTabId != null) {
    console.log(`${value.lastTabId} count start!`);
    const when = dayjs().add(30, "second").valueOf();
    chrome.alarms.create(`${value.lastTabId}`, { when });
  }
  chrome.storage.local.set({ lastTabId: tabId });
};

chrome.tabs.onCreated.addListener(async (tab) => {
  const value = await browser.storage.local.get("tabs");
  const tabs: chrome.tabs.Tab[] = value.tabs ?? [];
  tabs.push(tab);
  chrome.storage.local.set({ tabs });
  console.log("onCreated", tabs);
});

chrome.tabs.onActivated.addListener((tab) => {
  countStart(tab.tabId);
  console.log("onActivated", tab);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  chrome.alarms.clear(`${tabId}`);
  const value = await browser.storage.local.get("tabs");
  let tabs: chrome.tabs.Tab[] = value.tabs ?? [];
  tabs = tabs.filter((tab) => tab.id !== tabId);
  chrome.storage.local.set({ tabs });
  console.log("onRemoved", tabId, tabs);
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
