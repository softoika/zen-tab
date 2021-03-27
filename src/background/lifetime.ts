import { browser, Tabs } from "webextension-polyfill-ts";
import { ActivatedTabs, createActivatedTabs } from "tabs";
import {
  getOutdatedTabs,
  getStorage,
  updateOutdatedTabs,
  updateStorage,
} from "storage/tabs";
import type { Tab, TabId } from "types";
import type { TabStorage } from "storage/types";
import { loadOptions } from "storage/options";
import { log } from "utils";

type Alarm = chrome.alarms.Alarm;

export async function removeTabOnAlarm(alarm: Alarm) {
  log("onAlarm", alarm.name, alarm.scheduledTime);
  const tabId = +alarm.name;
  let tab: Tabs.Tab | undefined = undefined;
  try {
    tab = await browser.tabs.get(tabId);
  } catch {
    return;
  }
  if (!tab) {
    return;
  }
  const [tabs, minTabs] = await Promise.all([
    browser.tabs.query({
      windowType: "normal",
      windowId: tab.windowId,
    }),
    loadOptions("minTabs"),
  ]);
  if (tabs.length > minTabs) {
    log(`Removed ${tabId}`);
    browser.tabs.remove(tabId);
  } else {
    const outdatedTabs = await getOutdatedTabs();
    updateOutdatedTabs(outdatedTabs.push(tab));
  }
}

type TabsMap = TabStorage["tabsMap"];

/**
 * Set alarm for a last activated tab.
 * If it exists, memorize its inactivated timestamp. This is useful for showing
 * time left to close the tab.
 */
export async function expireLastTab(
  newTab: chrome.tabs.TabActiveInfo,
  currentMillis: number
) {
  if (!newTab?.tabId) {
    return;
  }
  await browser.alarms.clear(`${newTab.tabId}`);
  let storage = await getStorage(["activatedTabs", "tabsMap"]);
  const activatedTabs = new ActivatedTabs(storage.activatedTabs ?? {});
  const lastTabId = activatedTabs.getLastTabId(newTab.windowId);
  if (lastTabId) {
    const when = await getLifetime(currentMillis);
    browser.alarms.create(`${lastTabId}`, { when });
    storage = {
      ...storage,
      tabsMap: setLastInactivated(storage.tabsMap, lastTabId, currentMillis),
    };
  }
  updateStorage({
    ...storage,
    activatedTabs: activatedTabs.push(newTab.tabId, newTab.windowId).value,
  });
}

/**
 * Set alarms for all inactive tabs
 */
export async function expireInactiveTabs(tabs: Tab[], currentMillis: number) {
  browser.alarms.clear();
  if (tabs.length <= 0) {
    return;
  }

  const delayUnit = 1000;
  const when = await getLifetime(currentMillis);
  let totalDelay = 0;
  let tabsMap: TabStorage["tabsMap"] = {};
  tabs
    .filter((tab) => !tab.active)
    .map((tab) => tab.id)
    .forEach((tabId) => {
      if (!tabId) {
        return;
      }
      // Must delay alarms in each tab because it is not able to close tabs syncronously.
      browser.alarms.create(`${tabId}`, { when: when + totalDelay });
      tabsMap = {
        ...tabsMap,
        [tabId]: { lastInactivated: when + totalDelay },
      };
      tabsMap = setLastInactivated(tabsMap, tabId, currentMillis);
      totalDelay += delayUnit;
    });

  updateStorage({ tabsMap, activatedTabs: createActivatedTabs(tabs).value });
}

function setLastInactivated(
  tabsMap: TabsMap,
  tabId: TabId,
  currentMillis: number
) {
  if (!tabsMap) {
    tabsMap = {};
  }
  tabsMap = { ...tabsMap, [tabId]: { lastInactivated: currentMillis } };
  return tabsMap;
}

async function getLifetime(currentMillis: number) {
  const baseLimit = await loadOptions("baseLimit");
  return currentMillis + baseLimit;
}
