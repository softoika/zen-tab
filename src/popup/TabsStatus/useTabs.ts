import { useEffect, useState } from "react";
import type { Tab } from "types";
import { browser } from "webextension-polyfill-ts";

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  useEffect(() => {
    fetchTabs().then((t) => setTabs(t));
  }, []);
  return tabs;
}

async function fetchTabs(): Promise<Tab[]> {
  const window = await browser.windows.getCurrent();
  const windowId = window.id;
  if (windowId == null) {
    return [];
  }
  return browser.tabs.query({ windowId, windowType: "normal" });
}
