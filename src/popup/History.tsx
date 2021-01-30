import React from "react";
import type { Page } from "./types";

export const History: React.FC<{ selected: Page }> = ({ selected }) => {
  if (selected !== "history") {
    return null;
  }
  return <div>History</div>;
};
