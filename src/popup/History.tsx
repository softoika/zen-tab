import React, { useEffect, useState } from "react";
import { getClosedTabHistory } from "storage/tabs";
import type { ClosedTab } from "storage/types";
import { browser } from "webextension-polyfill-ts";
import { FavIcon } from "./components/FavIcon";
import type { Page } from "./types";

export const History: React.FC<{ page: Page }> = ({ page }) => {
  const { history, open } = useHistory();
  if (page !== "history") {
    return null;
  }
  return (
    <div>
      <ul>
        {history.map((tab) => (
          <li key={tab.id}>
            <button type="button" onClick={() => open(tab.url)}>
              <FavIcon favIconUrl={tab.favIconUrl} url={tab.url} />
              <span>{tab.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

function useHistory() {
  const [history, setHistory] = useState<readonly ClosedTab[]>([]);

  useEffect(() => {
    getHistory().then((t) => setHistory(t));
  }, [history]);

  const open = (url?: string) => {
    if (url) {
      browser.tabs.create({ url });
    }
  };

  return { history, open };
}

async function getHistory() {
  const [history, window] = await Promise.all([
    getClosedTabHistory(),
    browser.windows.getCurrent(),
  ]);
  const windowId = window.id;
  if (windowId == null) {
    return [];
  }
  return history.history[windowId] ?? [];
}
