import { useEffect, useState } from "react";

export function useViewport() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return { isCompact: w < 1200, isNarrow: w < 900 };
}
