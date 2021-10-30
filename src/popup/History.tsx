import React, { useEffect, useState } from "react";
import { getClosedTabHistory } from "storage/local";
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
    <ul className="space-y-4">
      {history.map((tab) => (
        <li key={tab.id}>
          <button
            type="button"
            onClick={() => open(tab.url)}
            className="flex items-start space-x-3 text-left"
          >
            <FavIcon favIconUrl={tab.favIconUrl} url={tab.url} />
            <span>{tab.title}</span>
          </button>
        </li>
      ))}
    </ul>
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
