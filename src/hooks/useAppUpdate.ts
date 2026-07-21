import { useState, useEffect } from "react";

export function useAppUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Check for updates every minute by comparing the latest commit SHA from GitHub API
    const checkUpdate = async () => {
      try {
        const res = await fetch("https://api.github.com/repos/DaveJeremiah/mimoe/commits/main");
        const data = await res.json();
        const latestSha = data.sha;
        
        if (!latestSha) return;

        const currentSha = localStorage.getItem("mimoe_commit_sha");
        if (!currentSha) {
          localStorage.setItem("mimoe_commit_sha", latestSha);
        } else if (currentSha !== latestSha) {
          setHasUpdate(true);
        }
      } catch (e) {
        // Ignore network errors (e.g. offline)
      }
    };
    
    checkUpdate();
    const int = setInterval(checkUpdate, 60000); // 1 minute
    return () => clearInterval(int);
  }, []);

  const triggerUpdate = () => {
    localStorage.removeItem("mimoe_commit_sha");
    window.location.reload();
  };

  return { hasUpdate, triggerUpdate };
}
