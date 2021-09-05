import type { Tabs } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { ActivatedTabs, createActivatedTabs } from "tabs";
import {
  getOutdatedTabs,
  getStorage,
  getValue,
  updateOutdatedTabs,
  updateStorage,
} from "storage/tabs";
import { isValidAsId } from "background/utils";
import type { Options, TabStorage } from "storage/types";
import { loadOptions } from "storage/options";
import type { Tab, TabId } from "types";
import { log } from "utils";
import { appendToEvacuationMap, evacuateAlarms } from "./evacuation";

type Alarm = chrome.alarms.Alarm;

export async function removeTabOnAlarm(alarm: Alarm) {
  log("onAlarm", alarm.name, alarm.scheduledTime);
  // do nothing if a name of the alarm is invalid or its id of tab does'nt exist.
  if (!isValidAsId(alarm.name)) {
    return;
  }
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

  const [tabs, minTabs, protectPinnedTabs] = await Promise.all([
    browser.tabs.query({
      windowType: "normal",
      windowId: tab.windowId,
    }),
    loadOptions("minTabs"),
    loadOptions("protectPinnedTabs"),
  ]);

  if (isProtectedAsPinnedTab(tab, protectPinnedTabs)) {
    log(`${tabId} is protected as a pinned tab`, tab, protectPinnedTabs);
    return;
  } else {
    log(`${tabId} is not protected as a pinned tab`, tab, protectPinnedTabs);
  }

  if (tabs.length > minTabs) {
    log(`Removed ${tabId}`);
    browser.tabs.remove(tabId);
  } else {
    const outdatedTabs = await getOutdatedTabs();
    updateOutdatedTabs(outdatedTabs.push(tab));
  }
}

/**
 * Remove the tab of alarms at once. If the number of tabs in each window
 * is the minTabs or less, push the tabs to the outdatedTabs.
 * It will be removed when a new tab is created.
 */
export async function removeTabOfAlarms(alarms: Alarm[]) {
  if (alarms.length === 0) {
    return;
  }
  const [minTabs, protectPinnedTabs, outdatedTabs, tabs] = await Promise.all([
    loadOptions("minTabs"),
    loadOptions("protectPinnedTabs"),
    getOutdatedTabs(),
    browser.tabs.query({ windowType: "normal" }),
  ]);

  // Create a map whose tab id corresponds to a tab object.
  const tabIdToTabMap: { [tabId: number]: Tabs.Tab } = {};
  tabs.forEach((tab) => {
    if (tab.id == null) return;
    tabIdToTabMap[tab.id] = tab;
  });

  // Create a valid id list from alarms
  const idOfAlarms = alarms
    .filter((a) => isValidAsId(a.name))
    .map((a) => +a.name)
    .filter((id) => !!tabIdToTabMap[id]);

  // Create a map that corresponds to the window id and the number of tabs in the window
  // and a map that corresponds the tab id and the window it belongs to.
  const tabCountMap: {
    [windowId: number]: number /* the number of tabs */;
  } = {};
  const tabIdToWindowIdMap: { [tabId: number]: number /* windowId */ } = {};
  tabs.forEach((t) => {
    if (t.windowId == null || t.id == null) {
      return;
    }
    const count = tabCountMap[t.windowId] ?? 0;
    tabCountMap[t.windowId] = count + 1;
    tabIdToWindowIdMap[t.id] = t.windowId;
  });

  // Remove more tabs than minTabs in each window.
  // If the number of tabs is minTabs or less, push tabs to outdatedTabs.
  const idsToBeRemoved: TabId[] = [];
  idOfAlarms.forEach((tabId) => {
    const windowId = tabIdToWindowIdMap[tabId];
    const tabCount = tabCountMap[windowId];
    const tab = tabIdToTabMap[tabId];

    if (isProtectedAsPinnedTab(tab, protectPinnedTabs)) {
      log(`${tabId} is protected as a pinned tab`, tab, protectPinnedTabs);
      return;
    } else {
      log(`${tabId} is not protected as a pinned tab`, tab, protectPinnedTabs);
    }

    if (tabCount > minTabs) {
      idsToBeRemoved.push(tabId);
      tabCountMap[windowId]--;
    } else {
      outdatedTabs.push(tabIdToTabMap[tabId]);
    }
  });

  // Remove tabs and update outdateTabs at once.
  browser.tabs.remove(idsToBeRemoved);
  updateOutdatedTabs(outdatedTabs);
}

function isProtectedAsPinnedTab(
  tab: Tabs.Tab,
  protectPinnedTabs: Options["protectPinnedTabs"]
) {
  return tab.pinned && protectPinnedTabs;
}

type TabsMap = TabStorage["tabsMap"];

/**
 * Set an alarm for the last activated tab.
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

  const [when, minTabs, tabs, ...rest] = await Promise.all([
    getLifetime(currentMillis),
    loadOptions("minTabs"),
    browser.tabs.query({ windowId: newTab.windowId, windowType: "normal" }),
    getStorage(["activatedTabs", "tabsMap"]),
    browser.alarms.clear(`${newTab.tabId}`),
  ]);
  let [storage] = rest;
  const activatedTabs = new ActivatedTabs(storage.activatedTabs ?? {});
  const lastTabId = activatedTabs.getLastTabId(newTab.windowId);

  if (lastTabId) {
    if (tabs.length > minTabs) {
      browser.alarms.create(`${lastTabId}`, { when });
    } else {
      await appendToEvacuationMap(`${lastTabId}`, { when }, newTab.windowId);
    }
    storage = {
      ...storage,
      tabsMap: updateTabsMap(storage.tabsMap, lastTabId, currentMillis, when),
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
      tabsMap = updateTabsMap(tabsMap, tabId, currentMillis, when);
      totalDelay += delayUnit;
    });

  updateStorage({ tabsMap, activatedTabs: createActivatedTabs(tabs).value });
}

export async function expireInactiveTab(tab: Tab, currentMillis: number) {
  if (!tab.id) {
    return;
  }
  if (tab.active) {
    return;
  }
  const [_tabsMap, when] = await Promise.all([
    getValue("tabsMap"),
    getLifetime(currentMillis),
    browser.alarms.clear(`${tab.id}`),
  ]);
  browser.alarms.create(`${tab.id}`, { when });
  const tabsMap = updateTabsMap(_tabsMap, tab.id, currentMillis, when);
  updateStorage({ tabsMap });
}

function updateTabsMap(
  tabsMap: TabsMap,
  tabId: TabId,
  currentMillis: number,
  when: number
) {
  if (!tabsMap) {
    tabsMap = {};
  }
  tabsMap = {
    ...tabsMap,
    [tabId]: { lastInactivated: currentMillis, scheduledTime: when },
  };
  return tabsMap;
}

async function getLifetime(currentMillis: number) {
  const baseLimit = await loadOptions("baseLimit");
  return currentMillis + baseLimit;
}
