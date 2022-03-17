import { watch } from "./util";

window.addEventListener("DOMContentLoaded", async () => {
  const searchParams = new URL(window.location.href).searchParams;
  const locator = searchParams.get("locator");

  if (locator) {
    await watch(locator, document.querySelector<HTMLVideoElement>("video"))
  }
}); 
