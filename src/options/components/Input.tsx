import React from "react";

type InputProps = JSX.IntrinsicElements["input"];

export const Input: React.VFC<InputProps> = (props) => (
  <input
    {...props}
    className="rounded-md border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-300 focus:ring-opacity-50"
  />
);
