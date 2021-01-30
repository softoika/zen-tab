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
      <Header selected={page} onChangePage={(page) => setPage(page)} />
      <main>
        <TabsStatus selected={page} />
        <History selected={page} />
      </main>
    </>
  );
};

ReactDOM.render(<Popup />, document.getElementById("root"));
