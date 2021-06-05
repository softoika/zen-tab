import { FavIcon } from "popup/components/FavIcon";
import React from "react";
import type { Page } from "../types";
import { useTabs } from "./useTabs";
import type { TimeLeft } from "./useTimeLeftMap";
import { useTimeLeftMap } from "./useTimeLeftMap";

export const TabsStatus: React.FC<{ page: Page }> = ({ page }) => {
  const tabs = useTabs();
  const timeLeftMap = useTimeLeftMap();
  if (page !== "tabs") {
    return null;
  }
  return (
    <ul className="space-y-4">
      {tabs.map((tab) => (
        <li key={tab.id} className="flex space-x-3 items-start">
          <TimeLeftOfTab
            timeLeft={timeLeftMap?.[tab.id ?? 0]}
            active={tab.active}
          />
          <FavIcon
            favIconUrl={tab.favIconUrl}
            url={tab.url ?? tab.pendingUrl}
          />
          <div>{tab.title ?? tab.url ?? tab.pendingUrl}</div>
        </li>
      ))}
    </ul>
  );
};

const TimeLeftOfTab: React.FC<{ timeLeft?: TimeLeft; active?: boolean }> = ({
  timeLeft,
  active,
}) => {
  const timeLeftText =
    timeLeft != null && !active
      ? `${timeLeft.minus ? "-" : ""}${timeLeft.hours}:${timeLeft.mins}`
      : "";
  return <div className="flex justify-end min-w-[35px]">{timeLeftText}</div>;
};
