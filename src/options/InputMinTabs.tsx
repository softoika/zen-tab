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
    <div>
      <label htmlFor="input-min-tabs">Minimum number of tabs</label>
      <input
        id="input-min-tabs"
        type="number"
        value={props.minTabs}
        onChange={(e) => updateMinTabs(e.target.value)}
      />
    </div>
  );
};
