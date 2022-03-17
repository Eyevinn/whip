import { WHIPClient } from "@eyevinn/whip-web-client";

import { watch } from "./watch";

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");
  const watchChannel = document.querySelector<HTMLAnchorElement>("a#watch-channel");
  const previewWindow = document.querySelector<HTMLDivElement>("#preview-window");

  input.value = `http://${window.location.hostname}:8000/api/v1/whip/broadcaster`

  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: input.value,
        element: videoIngest,
        opts: { debug: true },
      });

      await client.connect();
      const resourceUri = await client.getResourceUri();
      const response = await fetch("http://localhost:8000" + resourceUri);
      if (response.ok) {
        const json = await response.json();

        if (json.channel) {
          await watch(json.channel, document.querySelector<HTMLVideoElement>("video#preview"));
          previewWindow.classList.remove("hidden");
        }
        watchChannel.href = `watch.html?locator=${encodeURIComponent(json.channel)}`;
        watchChannel.classList.remove("hidden");
      }
    });
});
