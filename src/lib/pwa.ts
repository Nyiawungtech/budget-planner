import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function usePwa() {
  const prompt = useRef<InstallEvent | null>(null);
  const worker = useRef<ServiceWorker | null>(null);
  const reloadOnUpdate = useRef(false);
  const [installed, setInstalled] = useState(
    () =>
      matchMedia("(display-mode: standalone)").matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    const installable = (e: Event) => {
      e.preventDefault();
      prompt.current = e as InstallEvent;
    };
    const installedEvent = () => {
      prompt.current = null;
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", installable);
    window.addEventListener("appinstalled", installedEvent);
    return () => {
      window.removeEventListener("beforeinstallprompt", installable);
      window.removeEventListener("appinstalled", installedEvent);
    };
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let live = true;
    const controllerChange = () => {
      if (reloadOnUpdate.current) location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChange,
    );
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (!live) return;
        const available = () => {
          if (registration.waiting && navigator.serviceWorker.controller) {
            worker.current = registration.waiting;
            setUpdateReady(true);
          }
        };
        available();
        registration.addEventListener("updatefound", () => {
          registration.installing?.addEventListener("statechange", available);
        });
      })
      .catch(() => {
        /* The regular website still works if browser installation is unavailable. */
      });
    return () => {
      live = false;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChange,
      );
    };
  }, []);
  async function install(): Promise<"accepted" | "dismissed" | "manual"> {
    if (!prompt.current) return "manual";
    const event = prompt.current;
    prompt.current = null;
    await event.prompt();
    return (await event.userChoice).outcome;
  }
  function update() {
    reloadOnUpdate.current = true;
    worker.current?.postMessage({ type: "SKIP_WAITING" });
  }
  return { installed, updateReady, install, update };
}
