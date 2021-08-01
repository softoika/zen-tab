import { FavIcon } from "popup/components/FavIcon";
import React from "react";
import type { Tab } from "types";
import type { Page } from "../types";
import { useTabs } from "./useTabs";
import type { TimeLeft } from "./useTimeLeftMap";
import { useTimeLeftMap } from "./useTimeLeftMap";

export const TabsStatus: React.VFC<{ page: Page }> = ({ page }) => {
  const tabs = useTabs();
  const timeLeftMap = useTimeLeftMap();
  if (page !== "tabs") {
    return null;
  }
  return (
    <ul className="space-y-4">
      {tabs.map((tab) => (
        <li key={tab.id} className="flex space-x-3 items-center">
          <StatusLabel timeLeft={timeLeftMap?.[tab.id ?? 0]} tab={tab} />
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

const StatusLabel: React.VFC<{ timeLeft?: TimeLeft; tab: Tab }> = ({
  timeLeft,
  tab,
}) => {
  const LabelContent = () => {
    if (tab.active) {
      return <ActiveLabel />;
    }
    if (tab.pinned) {
      return <PinnedLabel />;
    }
    if (timeLeft) {
      return <TimeLeftLabel timeLeft={timeLeft} />;
    }
    return null;
  };

  return (
    <div className="flex-grow-0 flex-shrink-0 w-[50px]">
      <LabelContent />
    </div>
  );
};

const ActiveLabel: React.VFC = () => {
  return (
    <div className="flex justify-center p-1 bg-green-300 rounded-sm transform scale-75">
      ACTIVE
    </div>
  );
};

const PinnedLabel: React.VFC = () => {
  return (
    <div className="flex justify-center p-1 bg-gray-300 rounded-sm transform scale-75">
      PINNED
    </div>
  );
};

const TimeLeftLabel: React.VFC<{ timeLeft: TimeLeft }> = ({ timeLeft }) => {
  const zeroPad = (n: number) => `0${n}`.slice(-2);
  const timeLeftText = `${timeLeft.minus ? "-" : ""}${zeroPad(
    timeLeft.hours
  )}:${zeroPad(timeLeft.mins)}`;

  return (
    <div className="relative flex justify-center p-1 bg-green-100 rounded-sm transform scale-75 h-[26px]">
      {timeLeft.percentage > 0 && (
        <div
          className="absolute inset-y-0 left-0 h-full bg-green-300"
          style={{ width: `${timeLeft.percentage}%` }}
        ></div>
      )}
      <div className="absolute">{timeLeftText}</div>
    </div>
  );
};
