import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Header } from "./Header";
import { History } from "./History";
import { TabsStatus } from "./TabsStatus";
import type { Page } from "./types";

const Popup: React.FC = () => {
  const [page, setPage] = useState<Page>("tabs");
  return (
    <>
      <Header page={page} onChangePage={(page) => setPage(page)} />
      <main>
        <TabsStatus page={page} />
        <History page={page} />
      </main>
    </>
  );
};

ReactDOM.render(<Popup />, document.getElementById("root"));
