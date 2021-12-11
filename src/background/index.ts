import dayjs from "dayjs";
import { browser } from "webextension-polyfill-ts";
import { initOptions } from "storage/sync";
import {
  getClosedTabHistory,
  updateClosedTabHistory,
  updateStorage,
} from "storage/local";
import { expireInactiveTabs, removeTabOnAlarm } from "./core/lifetime";
import { log } from "utils";
import { ClosedTabsHistory } from "tabs";
import { handleTabsOnCreated } from "./tabs/onCreated";
import { handleTabsOnRemoved } from "./tabs/onRemoved";
import { handleTabsOnActivated } from "./tabs/onActivated";
import { handleIdleOnStateChanged } from "./idle/onStateChanged";
import { handleWindowsOnRemoved } from "./windows/onRemoved";

chrome.tabs.onCreated.addListener(handleTabsOnCreated);

chrome.tabs.onActivated.addListener(handleTabsOnActivated);

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const history = await getClosedTabHistory();
    updateClosedTabHistory(history.updateTab(tab));
  }
});

chrome.tabs.onRemoved.addListener(handleTabsOnRemoved);

chrome.windows.onRemoved.addListener(handleWindowsOnRemoved);

chrome.alarms.onAlarm.addListener((alarm) => removeTabOnAlarm(alarm));

chrome.storage.onChanged.addListener((changes) => {
  log("debug storage: ", changes);
});

chrome.idle.onStateChanged.addListener(handleIdleOnStateChanged);

const onInitExtension = async () => {
  const tabs = await browser.tabs.query({
    windowType: "normal",
  });
  await initOptions(process.env.NODE_ENV);
  expireInactiveTabs(tabs, dayjs().valueOf());
  const history = await getClosedTabHistory().then((h) => h.history);
  log(history);
  const closedTabHistory = new ClosedTabsHistory({}, history).createTabs(tabs);
  updateStorage({ activatedTabs: {}, outdatedTabs: {} });
  updateClosedTabHistory(closedTabHistory);
};

chrome.runtime.onInstalled.addListener((details) => {
  log("onInstalled", details);
  onInitExtension();
});
