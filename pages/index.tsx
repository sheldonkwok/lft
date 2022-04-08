import { useState } from "react";
import type { NextPage } from "next";

const TYPE_REGEX = /[\w,\s]/;
const SET_REGEX = /\d/;

function validateSyntax(str: string): boolean {
  let isType = true;
  let isSet = false;

  let isReps = false;
  let hasWeight = false;
  let hasReps = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "\n") {
      const lastChar = i > 0 ? str[i - 1] : null;

      if (isType) {
        isType = false;
        isSet = true;
      } else if (lastChar === "\n") {
        isType = true;

        isSet = false;
        isReps = false;
        hasWeight = false;
      } else if (isSet) {
        if (!hasReps) return false;

        isReps = false;
        hasReps = false;
      }
    } else {
      if (isType && !TYPE_REGEX.test(char)) return false;
      if (!isSet) continue;

      if (SET_REGEX.test(char)) {
        if (!isReps) {
          hasWeight = true;
        } else {
          hasReps = true;
        }
      } else if (hasWeight && char === "x") {
        hasWeight = false;
        isReps = true;
      } else {
        return false;
      }
    }
  }

  return true;
}

const Home: NextPage = () => {
  const [value, setValue] = useState("");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <textarea
        autoFocus
        style={{
          width: 300,
          height: 500,
          border: "none",
          outline: "none",
          resize: "none",
        }}
        value={value}
        ref={(inputElement) => inputElement?.focus()}
        onClick={(e) => {
          const target = e.target;
          const { selectionStart, selectionEnd } =
            target as HTMLTextAreaElement;
        }}
        onChange={(e) => {
          const target = e.target;
          const value = target.value;

          if (validateSyntax(value)) setValue(value);

          const { selectionStart, selectionEnd } = target;
        }}
      ></textarea>
    </div>
  );
};

export default Home;
