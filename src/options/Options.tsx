import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "styles.css";
import { loadOptions, saveOptions } from "storage/options";
import type { Options as OptionsType } from "storage/types";
import { InputBaseLimit } from "./InputBaseLimit";
import { InputMinTabs } from "./InputMinTabs";

const Options: React.FC = () => {
  const [options, setOptions] = useState<OptionsType | null>(null);

  useEffect(() => {
    loadOptions().then((o) => setOptions(o));
  }, []);

  const updateOptions = <K extends keyof OptionsType>(
    _options: Pick<OptionsType, K>
  ) => {
    if (!options) {
      return;
    }
    console.log(_options);
    setOptions({ ...options, ..._options });
  };

  const save = () => {
    if (!options) {
      return;
    }
    saveOptions(options);
  };

  return (
    <div className="p-4 mx-auto mt-4 bg-white max-w-screen-md space-y-4 rounded-md shadow-sm">
      <InputMinTabs
        minTabs={options?.minTabs ?? 0}
        onUpdate={(minTabs) => updateOptions({ minTabs })}
      />
      <InputBaseLimit
        baseLimit={options?.baseLimit ?? 0}
        onUpdate={(baseLimit) => updateOptions({ baseLimit })}
      />
      <button
        className="px-4 py-2 text-base font-medium text-white bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 focus:ring-offset-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        onClick={() => save()}
      >
        Save
      </button>
    </div>
  );
};

ReactDOM.render(<Options />, document.getElementById("root"));
