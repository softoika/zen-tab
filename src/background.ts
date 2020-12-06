import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { OptionsService } from "./options-service";
import { TabStorageService } from "./tab-storage-service";

dayjs.extend(duration);
const optionsService = new OptionsService(browser.storage.sync).set({
  minTabs: 5,
  baseLimit: dayjs.duration(30, "seconds").asMilliseconds(),
});
const tabStorageService = new TabStorageService(browser.storage.local);
const lifeLimit = new LifeLimit(tabStorageService, browser.alarms);

chrome.tabs.onCreated.addListener((tab) => {
  console.log("onCreated", tab);
  tabStorageService.add(tab);
});

chrome.tabs.onActivated.addListener(async (tab) => {
  const baseLimit = await optionsService.get("baseLimit");
  lifeLimit.countDown(tab.tabId, dayjs().valueOf() + baseLimit);
  console.log("onActivated", tab);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
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
  // TODO count a number of tabs in each window
  const tabs = await browser.tabs.query({ windowType: "normal" });
  const minTabs = await optionsService.get("minTabs");
  if (tab && tabs.length > minTabs) {
    console.log(`Removed ${tabId}`);
    chrome.tabs.remove(tabId);
  }
});

// chrome.storage.onChanged.addListener((changes) => {
//   console.log("debug storage: ", changes);
// });

const onInitExtension = async () => {
  const tabs = await browser.tabs.query({
    windowType: "normal",
    active: false,
  });
  console.log(tabs.length);
  tabStorageService.updateAllTabs(tabs);
  chrome.alarms.clear();
  // Set alarms for all tabs
  // Must delay alarms in each tab because it is not able to close tabs syncronously.
  let delay = 1000;
  const baseLimit = await optionsService.get("baseLimit");
  tabs
    .map((tab) => tab.id)
    .forEach((tabId) => {
      browser.alarms.create(`${tabId}`, {
        when: dayjs().valueOf() + baseLimit + delay,
      });
      delay += 1000;
    });
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
