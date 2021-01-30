import React from "react";
import { browser } from "webextension-polyfill-ts";
import type { Page } from "./types";

export const Header: React.FC<{
  selected: Page;
  onChangePage(page: Page): void;
}> = ({ selected, onChangePage }) => {
  return (
    <header>
      <button
        className={selected === "tabs" ? "selected" : ""}
        onClick={() => onChangePage("tabs")}
      >
        Tabs
      </button>
      <button
        className={selected === "history" ? "selected" : ""}
        onClick={() => onChangePage("history")}
      >
        History
      </button>
      <button onClick={() => browser.runtime.openOptionsPage()}>
        Settings
      </button>
    </header>
  );
};
