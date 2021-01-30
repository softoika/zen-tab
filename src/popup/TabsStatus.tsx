import React from "react";
import type { Page } from "./types";

export const TabsStatus: React.FC<{ selected: Page }> = ({ selected }) => {
  if (selected !== "tabs") {
    return null;
  }
  return <div>Tabs</div>;
};
