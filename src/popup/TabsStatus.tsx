import React, { useEffect, useState } from "react";
import type { Tab } from "types";
import { browser } from "webextension-polyfill-ts";
import type { Page } from "./types";

async function fetchTabs(): Promise<Tab[]> {
  const window = await browser.windows.getCurrent();
  const windowId = window.id;
  if (windowId == null) {
    return [];
  }
  return browser.tabs.query({ windowId, windowType: "normal" });
}

// TODO  remaining time to close(lastActivated and Optoins.baseLimit are necessary)
export const TabsStatus: React.FC<{ selected: Page }> = ({ selected }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  useEffect(() => {
    fetchTabs().then((t) => setTabs(t));
  }, []);
  if (selected !== "tabs") {
    return null;
  }
  return (
    <ul>
      {tabs.map((tab) => (
        <li key={tab.id}>
          <div>{tab.title}</div>
          <div>{tab.url ?? tab.pendingUrl}</div>
        </li>
      ))}
    </ul>
  );
};
