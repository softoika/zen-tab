import React, { useState } from "react";
import ReactDOM from "react-dom";
import "styles.css";
import { Header } from "./Header";
import { History } from "./History";
import { TabsStatus } from "./TabsStatus";
import type { Page } from "./types";

const Popup: React.FC = () => {
  const [page, setPage] = useState<Page>("tabs");
  return (
    <>
      <Header page={page} onChangePage={(page) => setPage(page)} />
      <main className="p-4 overflow-auto" style={{ maxHeight: "550px" }}>
        <TabsStatus page={page} />
        <History page={page} />
      </main>
    </>
  );
};

ReactDOM.render(<Popup />, document.getElementById("root"));
