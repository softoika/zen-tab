import React from "react";
import type { Options } from "storage/types";

type Props = Pick<Options, "minTabs"> & {
  onUpdate(minTabs: Options["minTabs"]): void;
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
      <input
        type="number"
        id="input-min-tabs"
        value={props.minTabs}
        onChange={(e) => updateMinTabs(e.target.value)}
        className="border-gray-300 rounded-md shadow-sm"
      />
    </div>
  );
};
