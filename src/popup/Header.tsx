import React from "react";
import { browser } from "webextension-polyfill-ts";
import type { Page } from "./types";

export const Header: React.FC<{
  page: Page;
  onChangePage(page: Page): void;
}> = ({ page, onChangePage }) => {
  return (
    <header className="flex justify-between border-b whitespace-nowrap">
      <div>
        <TabButton
          selected={page === "tabs"}
          label="Tabs"
          onSelect={() => onChangePage("tabs")}
        />
        <TabButton
          selected={page === "history"}
          label="History"
          onSelect={() => onChangePage("history")}
        />
      </div>
      <SettingsButton />
    </header>
  );
};

const TabButton: React.FC<{
  selected: boolean;
  label: string;
  onSelect(): void;
}> = ({ selected, label, onSelect }) => (
  <button
    type="button"
    className={
      "p-2 text-lg border-b-2 border-opacity-0 focus:outline-none focus:border-opacity-100 hover:border-opacity-100 " +
      (selected
        ? " border-opacity-100 text-blue-500 border-blue-200"
        : " border-gray-200")
    }
    onClick={() => onSelect()}
  >
    {label}
  </button>
);

const SettingsButton = () => (
  <button
    className="p-2"
    onClick={() => browser.runtime.openOptionsPage()}
    aria-label="settings"
  >
    <svg
      className="w-6 h-6 text-gray-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  </button>
);
