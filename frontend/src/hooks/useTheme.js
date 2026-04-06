import { useState, useEffect } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("finos-theme") || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("finos-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle, isDark: theme === "dark" };
};
