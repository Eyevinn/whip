import { WHIPClient } from "@eyevinn/whip-web-client";

import { watch, getIceServers } from "./util";

function createWatchLink(channel) {
  const link = document.createElement("a");
  link.href = `watch.html?locator=${encodeURIComponent(channel.resource)}`;
  link.innerText = `Watch Channel`;
  link.target = "_blank";
  return link;
}

async function renderChannelList() {
  const broadcasterUrl = process.env.NODE_ENV === "development" ? "http://localhost:8001/broadcaster/channel" : "https://broadcaster-wrtc.prod.eyevinn.technology/broadcaster/channel";
  const channelWindow = document.querySelector("#channel-window");
  const response = await fetch(broadcasterUrl);
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
  let iceServers = getIceServers();
  let authkey;

  if (process.env.NODE_ENV === "development") {
    input.value = `http://${window.location.hostname}:8000/api/v1/whip/broadcaster`;
    authkey = "devkey";
  } else {
    input.value = "https://broadcaster-whip.prod.eyevinn.technology/api/v1/whip/broadcaster";
    authkey = process.env.API_KEY;
  }

  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: input.value,
        element: videoIngest,
        opts: { debug: true, iceServers: iceServers, iceConfigFromEndpoint: true, authkey: authkey },
      });

      await client.connect();
      const resourceUri = await client.getResourceUri();
      // Workaround until we get the full URI above
      const url = new URL(input.value);
      url.pathname = resourceUri;
      const response = await fetch(url.href);
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
