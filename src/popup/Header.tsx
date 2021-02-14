import React from "react";
import { browser } from "webextension-polyfill-ts";
import type { Page } from "./types";

export const Header: React.FC<{
  page: Page;
  onChangePage(page: Page): void;
}> = ({ page, onChangePage }) => {
  return (
    <header>
      <div>
        <button
          className={page === "tabs" ? "selected" : ""}
          onClick={() => onChangePage("tabs")}
        >
          Tabs
        </button>
        <button
          className={page === "history" ? "selected" : ""}
          onClick={() => onChangePage("history")}
        >
          History
        </button>
      </div>
      <button onClick={() => browser.runtime.openOptionsPage()}>
        Settings
      </button>
    </header>
  );
};
