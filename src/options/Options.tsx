import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "styles.css";
import { loadOptions, saveOptions } from "storage/sync";
import type { SyncStorage as OptionsType } from "storage/types";
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
      <button className="btn-primary" onClick={() => save()}>
        Save
      </button>
    </div>
  );
};

ReactDOM.render(<Options />, document.getElementById("root"));
