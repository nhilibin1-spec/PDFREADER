import { useCallback, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

function detectStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorStandalone).standalone);
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(detectStandalone);
  const [outcome, setOutcome] = useState<"accepted" | "dismissed" | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setOutcome("accepted");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(detectStandalone());
    media.addEventListener("change", onDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener("change", onDisplayMode);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "manual" | "installed"> => {
    if (installed) return "installed";
    if (!promptEvent) return "manual";
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setOutcome(choice.outcome);
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
    return choice.outcome;
  }, [installed, promptEvent]);

  return {
    canInstall: Boolean(promptEvent),
    installed,
    outcome,
    install,
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    isAndroid: /android/i.test(navigator.userAgent),
  };
}

export type InstallController = ReturnType<typeof useInstallPrompt>;
