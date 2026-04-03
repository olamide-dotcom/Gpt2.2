import { useEffect } from "react";
import { getWorkflowSnapshot } from "@/lib/account-workflow";

// AutoSave: silently persist snapshot on visibility change / unload
export default function AutoSave() {
  useEffect(() => {
    const persist = () => {
      try {
        // getWorkflowSnapshot will read and persist the normalized snapshot synchronously
        // (writeStorage uses localStorage synchronously), so calling it here ensures
        // the latest snapshot is written to storage.
        // We don't await to avoid blocking unload; the internal write is synchronous.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        getWorkflowSnapshot();
      } catch (err) {
        // swallow errors silently; this is a best-effort save
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) persist();
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      persist();
      // no custom message; modern browsers ignore returnValue text, but setting it may trigger the prompt.
      // e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", onBeforeUnload);

    // also persist once on mount
    persist();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
