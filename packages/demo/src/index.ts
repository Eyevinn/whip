import { WHIPClient } from "@eyevinn/whip-web-client";

import { watch } from "./util";

function createWatchLink(channel) {
  const link = document.createElement("a");
  link.href = `watch.html?locator=${encodeURIComponent(channel.resource)}`;
  link.innerText = `Watch Channel`;
  link.target = "_blank";
  return link;
}

async function renderChannelList() {
  const channelWindow = document.querySelector("#channel-window");
  const response = await fetch("http://localhost:8001/broadcaster/channel");
  if (response.ok) {
    const json = await response.json();
    if (json.length > 0) {
      json.map(channel => {
        channelWindow.appendChild(createWatchLink(channel));
      });
      channelWindow.classList.remove("hidden");
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");
  const previewWindow = document.querySelector<HTMLDivElement>("#preview-window");
  const channelWindow = document.querySelector("#channel-window");

  await renderChannelList();

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
          channelWindow.appendChild(createWatchLink({ resource: json.channel }));
          channelWindow.classList.remove("hidden");
        }
      }
    });
});
