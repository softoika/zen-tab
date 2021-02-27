import React, { useEffect, useState } from "react";
import { loadOptions } from "storage/options";
import { getValue } from "storage/tabs";
import type { Options, TabStorage } from "storage/types";
import type { NotNull, Tab } from "types";
import { browser } from "webextension-polyfill-ts";
import type { Page } from "./types";

export const TabsStatus: React.FC<{ page: Page }> = ({ page }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  useEffect(() => {
    fetchTabs().then((t) => setTabs(t));
  }, []);
  const [tabsMap, setTabsMap] = useState<TabStorage["tabsMap"]>(undefined);
  useEffect(() => {
    fetchTabsMap().then((t) => setTabsMap(t));
  }, []);
  const [baseLimit, setBaseLimit] = useState<Options["baseLimit"]>(0);
  useEffect(() => {
    loadOptions("baseLimit").then((b) => setBaseLimit(b));
  }, []);
  const [timeLeftMap, setTimeLeftMap] = useState<TimeLeftMap | null>(null);
  useEffect(() => {
    const currentMillis = Date.now();
    const timer = setInterval(
      () =>
        setTimeLeftMap(calculateTimeLeft(baseLimit, tabsMap, currentMillis)),
      1000
    );
    return () => clearInterval(timer);
  }, [timeLeftMap, baseLimit, tabsMap]);
  if (page !== "tabs") {
    return null;
  }
  return (
    <ul>
      {tabs.map((tab) => (
        <li key={tab.id}>
          <div>
            {timeLeftMap?.[tab.id ?? 0] && (
              <>
                <span>{timeLeftMap?.[tab.id ?? 0]?.minus && "-"}</span>
                <span>{timeLeftMap?.[tab.id ?? 0]?.hours}</span>
                <span>hours</span>
                <span>{timeLeftMap?.[tab.id ?? 0]?.mins}</span>
                <span>mins</span>
              </>
            )}
          </div>
          <img
            src={
              tab.favIconUrl ||
              `chrome://favicon/${tab.url ?? tab.pendingUrl ?? ""}`
            }
            alt="favicon"
            height="16"
            width="16"
          />
          <div>{tab.title ?? tab.url ?? tab.pendingUrl}</div>
        </li>
      ))}
    </ul>
  );
};

async function fetchTabs(): Promise<Tab[]> {
  const window = await browser.windows.getCurrent();
  const windowId = window.id;
  if (windowId == null) {
    return [];
  }
  return browser.tabs.query({ windowId, windowType: "normal" });
}

async function fetchTabsMap() {
  const tabsMap = await getValue("tabsMap");
  if (!tabsMap) {
    return {};
  }
  return tabsMap;
}

interface TimeLeft {
  timeLeftMillis: number;
  minus: boolean;
  hours: number;
  mins: number;
}

type TimeLeftMap = { [_ in TabId]?: TimeLeft };

type TabId = NotNull<Tab["id"]>;

function calculateTimeLeft(
  baseLimit: Options["baseLimit"],
  tabsMap: TabStorage["tabsMap"],
  currentMillis: number
): TimeLeftMap {
  const timeLeftMap: TimeLeftMap = {};
  Object.entries(tabsMap ?? {}).forEach(([tabId, tabInfo]) => {
    if (tabInfo.lastInactivated == null) {
      return;
    }
    const timeLeftMillis = baseLimit + tabInfo.lastInactivated - currentMillis;
    const minus = timeLeftMillis < 0;
    const absMillis = Math.abs(timeLeftMillis);
    const hours = Math.trunc(absMillis / 3_600_000);
    const mins = Math.trunc((absMillis % 3_600_000) / 60_000);
    timeLeftMap[+tabId] = { timeLeftMillis, minus, hours, mins };
  });
  return timeLeftMap;
}
