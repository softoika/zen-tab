import React from "react";

type Props = {
  favIconUrl?: string;
  url?: string;
};

export const FavIcon: React.VFC<Props> = ({ favIconUrl, url }) => {
  if (favIconUrl == null && url == null) {
    return null;
  }
  return (
    <img
      src={favIconUrl || `chrome://favicon/${url}`}
      alt="favicon"
      height="16"
      width="16"
    />
  );
};
