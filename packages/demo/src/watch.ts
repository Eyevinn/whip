import { getViewerCount, watch } from "./util";

window.addEventListener("DOMContentLoaded", async () => {
  const searchParams = new URL(window.location.href).searchParams;
  const locator = searchParams.get("locator");

  if (locator) {
    await watch(locator, document.querySelector<HTMLVideoElement>("video"));

    const t = setInterval(async () => { 
      const viewerCount = await getViewerCount(locator);
      document.querySelector<HTMLDivElement>("#viewercount").innerHTML = `${viewerCount} viewers`;  
    }, 5000);
  }
}); 
