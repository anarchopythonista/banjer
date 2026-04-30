import { useEffect, useState } from "react";
import { BanjoTabEditor } from "../BanjoTabEditor/BanjoTabEditor";
import { getStoredTheme, saveTheme, type AppTheme } from "./appPreferencesRepository";
import "./AppShell.css";

type AppShellProps = {
  initialTheme?: AppTheme;
  persistTheme?: boolean;
};

export function AppShell({ initialTheme, persistTheme = true }: AppShellProps) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme ?? "light");
  const isDark = theme === "dark";

  useEffect(() => {
    if (!persistTheme || initialTheme !== undefined) {
      return;
    }

    let isActive = true;

    void getStoredTheme()
      .then((storedTheme) => {
        if (isActive && storedTheme) {
          setTheme(storedTheme);
        }
      })
      .catch(() => {
        // Theme persistence should never block the editor.
      });

    return () => {
      isActive = false;
    };
  }, [initialTheme, persistTheme]);

  const handleToggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);

    if (persistTheme) {
      void saveTheme(nextTheme).catch(() => {
        // Keep the user's in-memory choice even if storage fails.
      });
    }
  };

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
          onClick={handleToggleTheme}
        >
          <span aria-hidden="true">{isDark ? "Light" : "Dark"}</span>
        </button>
      </nav>
      <BanjoTabEditor />
    </div>
  );
}
