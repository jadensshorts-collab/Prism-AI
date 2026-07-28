import { useEffect } from "react";

const BASE_TITLE = "Prism AI — Reveal the hidden layers behind every product";

// Keeps the browser tab (and anything reading the live DOM) in sync with what
// is actually on screen. Restores the site title on unmount so navigating away
// never leaves a stale product name behind.
export function useDocumentTitle(title, description) {
  useEffect(() => {
    if (!title) return;
    const prevTitle = document.title;
    document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content");
    if (metaDesc && description) metaDesc.setAttribute("content", description);

    return () => {
      document.title = prevTitle || BASE_TITLE;
      if (metaDesc && prevDesc != null) metaDesc.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}
