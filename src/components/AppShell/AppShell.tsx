import { useState } from "react";
import { BanjoTabEditor } from "../BanjoTabEditor/BanjoTabEditor";
import "./AppShell.css";

type AppShellProps = {
  initialTheme?: "light" | "dark";
};

export function AppShell({ initialTheme = "light" }: AppShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const isDark = theme === "dark";

  return (
    <div className="app-shell" data-theme={theme}>
      <nav className="app-shell-navbar" aria-label="Primary">
        <a className="app-shell-brand" href="/" aria-label="Banjer home">
          Banjer
        </a>
        <button
          type="button"
          className="app-shell-theme-toggle"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDark}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <span aria-hidden="true">{isDark ? "Light" : "Dark"}</span>
        </button>
      </nav>
      <BanjoTabEditor />
    </div>
  );
}
