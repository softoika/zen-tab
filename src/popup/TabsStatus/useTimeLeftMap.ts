import { useEffect, useState } from "react";
import { loadOptions } from "storage/options";
import { getValue } from "storage/tabs";
import type { Options, TabStorage } from "storage/types";
import type { TabId } from "types";

export interface TimeLeft {
  timeLeftMillis: number;
  minus: boolean;
  hours: number;
  mins: number;
}

type TimeLeftMap = { [_ in TabId]?: TimeLeft };

export function useTimeLeftMap() {
  const tabsMap = useTabsMap();
  const baseLimit = useBaseLimit();

  const [timeLeftMap, setTimeLeftMap] = useState<TimeLeftMap | null>(null);
  useEffect(() => {
    if (baseLimit === 0 || tabsMap == null) {
      return;
    }
    const currentMillis = Date.now();
    if (timeLeftMap == null) {
      // Build the map instantly at first
      setTimeLeftMap(calculateTimeLeft(baseLimit, tabsMap, currentMillis));
      return;
    }
    const timer = setTimeout(
      () =>
        setTimeLeftMap(calculateTimeLeft(baseLimit, tabsMap, currentMillis)),
      1000
    );
    return () => clearTimeout(timer);
  }, [timeLeftMap, baseLimit, tabsMap]);

  return timeLeftMap;
}

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

function useTabsMap() {
  const [tabsMap, setTabsMap] = useState<TabStorage["tabsMap"]>(undefined);
  useEffect(() => {
    fetchTabsMap().then((t) => setTabsMap(t));
  }, []);
  return tabsMap;
}

async function fetchTabsMap() {
  const tabsMap = await getValue("tabsMap");
  if (!tabsMap) {
    return {};
  }
  return tabsMap;
}

function useBaseLimit() {
  const [baseLimit, setBaseLimit] = useState<Options["baseLimit"]>(0);
  useEffect(() => {
    loadOptions("baseLimit").then((b) => setBaseLimit(b));
  }, []);
  return baseLimit;
}
