import React from "react";
import type { Options } from "storage/types";

type BaseLimit = Options["baseLimit"];

type Props = Pick<Options, "baseLimit"> & {
  onUpdate(baseLimit: BaseLimit): void;
};

export const InputBaseLimit: React.FC<Props> = (props) => {
  const [hours, mins, remainder] = convertToValues(props.baseLimit);
  const updateHours = (value: string) => {
    let h = parseInt(value);
    if (isNaN(h)) {
      return;
    }
    h = h > 0 ? h : 0;
    props.onUpdate(h * 3_600_000 + mins * 60_000 + remainder);
  };
  const updateMins = (value: string) => {
    let m = parseInt(value);
    if (isNaN(m)) {
      return;
    }
    m = m > 0 ? m : 0;
    props.onUpdate(hours * 3_600_000 + m * 60_000 + remainder);
  };
  return (
    <div>
      base limit:
      <label>
        <input
          id="hours"
          type="number"
          value={hours}
          onChange={(e) => updateHours(e.target.value)}
        />
        hours
      </label>
      <label>
        <input
          id="mins"
          type="number"
          value={mins}
          onChange={(e) => updateMins(e.target.value)}
        />
        mins
      </label>
    </div>
  );
};

function convertToValues(baseLimit: BaseLimit) {
  const hours = Math.trunc(baseLimit / 3_600_000);
  baseLimit = baseLimit % 3_600_000;
  const mins = Math.trunc(baseLimit / 60_000);
  return [hours, mins, baseLimit % 60_000] as const;
}
