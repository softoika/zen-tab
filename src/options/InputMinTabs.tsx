import React from "react";
import type { SyncStorage } from "storage/types";
import { Input } from "./components/Input";

type Props = Pick<SyncStorage, "minTabs"> & {
  onUpdate(minTabs: SyncStorage["minTabs"]): void;
};

export const InputMinTabs: React.FC<Props> = (props) => {
  const updateMinTabs = (value: string) => {
    const n = parseInt(value);
    if (isNaN(n)) {
      return;
    }
    props.onUpdate(n);
  };
  return (
    <div className="space-y-2">
      <label htmlFor="input-min-tabs" className="block text-lg font-medium">
        Minimum number of tabs
      </label>
      <Input
        type="number"
        id="input-min-tabs"
        value={props.minTabs}
        onChange={(e) => updateMinTabs(e.target.value)}
      />
    </div>
  );
};
