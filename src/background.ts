import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { OptionsService } from "./options-service";
import { TabStorageService } from "./tab-storage-service";

let _optionsService: Promise<OptionsService>;
async function getOpionsService(): Promise<OptionsService> {
  if (_optionsService) {
    return _optionsService;
  }
  _optionsService = new OptionsService(browser.storage.sync).init(
    process.env.NODE_ENV
  );
  return _optionsService;
}

const tabStorageService = new TabStorageService(browser.storage.local);
const lifeLimit = new LifeLimit(tabStorageService, browser.alarms);

chrome.tabs.onCreated.addListener((tab) => {
  console.log("onCreated", tab);
  tabStorageService.add(tab);
});

chrome.tabs.onActivated.addListener(async (tab) => {
  const optionsService = await getOpionsService();
  const baseLimit = await optionsService.get("baseLimit");
  lifeLimit.expireLastTab(tab.tabId, dayjs().valueOf() + baseLimit);
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
  const optionsService = await getOpionsService();
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
  const optionsService = await getOpionsService();
  const baseLimit = await optionsService.get("baseLimit");
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
