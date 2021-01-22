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
    <div>
      <InputMinTabs
        minTabs={options?.minTabs ?? 0}
        onUpdate={(minTabs) => updateOptions({ minTabs })}
      />
      <InputBaseLimit
        baseLimit={options?.baseLimit ?? 0}
        onUpdate={(baseLimit) => updateOptions({ baseLimit })}
      />
      <button onClick={() => save()}>Save</button>
    </div>
  );
};

ReactDOM.render(<Options />, document.getElementById("root"));
