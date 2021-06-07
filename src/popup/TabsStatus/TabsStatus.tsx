import { FavIcon } from "popup/components/FavIcon";
import React from "react";
import type { Tab } from "types";
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
        <li key={tab.id} className="flex space-x-3 items-center">
          <TimeLeftOfTab timeLeft={timeLeftMap?.[tab.id ?? 0]} tab={tab} />
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

const TimeLeftOfTab: React.FC<{ timeLeft?: TimeLeft; tab: Tab }> = ({
  timeLeft,
  tab,
}) => {
  const timeLeftText =
    timeLeft != null
      ? `${timeLeft.minus ? "-" : ""}${timeLeft.hours}:${timeLeft.mins}`
      : "";
  return (
    <div className="flex-grow-0 flex-shrink-0 w-[50px]">
      <TimeLeftContent timeLeftText={timeLeftText} tab={tab} />
    </div>
  );
};

const TimeLeftContent: React.VFC<{ timeLeftText: string; tab: Tab }> = ({
  timeLeftText,
  tab,
}) => {
  if (tab.active) {
    return (
      <div className="flex justify-center p-1 bg-green-300 rounded-sm transform scale-75">
        ACTIVE
      </div>
    );
  } else if (tab.pinned) {
    return (
      <div className="flex justify-center p-1 bg-gray-300 rounded-sm transform scale-75">
        PINNED
      </div>
    );
  } else {
    return <div className="text-right">{timeLeftText}</div>;
  }
};
