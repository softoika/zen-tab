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
    <ul>
      {tabs.map((tab) => (
        <li key={tab.id}>
          <div>
            {timeLeftMap?.[tab.id ?? 0] && (
              <TimeLeftOfTab
                timeLeft={timeLeftMap?.[tab.id ?? 0]}
                active={tab.active}
              />
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

const TimeLeftOfTab: React.FC<{ timeLeft?: TimeLeft; active?: boolean }> = ({
  timeLeft,
  active,
}) => {
  if (timeLeft == null || active) {
    return null;
  }
  return (
    <>
      <span>{timeLeft.minus && "-"}</span>
      <span>{timeLeft.hours}</span>
      <span>:</span>
      <span>{timeLeft.mins}</span>
    </>
  );
};
