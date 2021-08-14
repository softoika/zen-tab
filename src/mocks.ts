import type { Tabs } from "webextension-polyfill-ts";
import type { Tab } from "./types";

export const DEFAULT_TAB: Tab = {
  id: 1,
  windowId: 1,
  active: true,
  autoDiscardable: true,
  selected: true,
  discarded: false,
  pinned: false,
  index: 0,
  incognito: false,
  highlighted: true,
};

type BrowserTab = Tabs.Tab;
export const DEFAULT_BROWSER_TAB: BrowserTab = {
  ...DEFAULT_TAB,
  mutedInfo: undefined,
  active: true,
  pinned: false,
  index: 0,
  incognito: false,
  highlighted: true,
};

export const DEFAULT_CHROME_TAB: chrome.tabs.Tab = {
  id: 1,
  windowId: 1,
  index: 0,
  groupId: 0,
  autoDiscardable: false,
  discarded: false,
  pinned: false,
  selected: false,
  highlighted: false,
  incognito: false,
  active: true,
};
