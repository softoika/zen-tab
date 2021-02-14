import React from "react";
import type { Page } from "./types";

export const History: React.FC<{ page: Page }> = ({ page }) => {
  if (page !== "history") {
    return null;
  }
  return <div>History</div>;
};
