import { WHIPClient } from "../../sdk/src/index";

import { watch } from "./util";

function createWatchLink(channel) {
  const link = document.createElement("a");
  link.href = `watch.html?locator=${encodeURIComponent(channel.resource)}`;
  link.innerText = `Watch Channel`;
  link.target = "_blank";
  return link;
}

async function createClientItem(client: WHIPClient) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const deleteBtn = document.createElement("button");

  summary.innerText = await client.getResourceUrl();

  deleteBtn.innerText = "Delete";
  deleteBtn.onclick = async () => {
    await client.destroy();
    details.parentNode?.removeChild(details);
  }

  details.appendChild(summary);
  details.appendChild(deleteBtn);

  return details;
}

async function updateChannelList() {
  const channels = document.querySelector("#channels");
  channels.innerHTML = ""
  const response = await fetch("http://localhost:8001/broadcaster/channel");
  if (response.ok) {
    const json = await response.json();
    if (json.length > 0) {
      json.map((channel) => {
        channels.appendChild(createWatchLink(channel));
      });
    }
  }
}

async function ingest(client: WHIPClient, mediaStream: MediaStream) {
  const resources =
    document.querySelector<HTMLDivElement>("#resources");
  const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");

  videoIngest.srcObject = mediaStream;
  await client.ingest(mediaStream);

  resources.appendChild(await createClientItem(client));
  updateChannelList();
}

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const ingestCamera =
    document.querySelector<HTMLButtonElement>("#ingest-camera");
  const ingestScreen =
    document.querySelector<HTMLButtonElement>("#ingest-screen");

  await updateChannelList();

  input.value = `http://${window.location.hostname}:8000/api/v1/whip/broadcaster`;

  ingestCamera.addEventListener("click", async () => {
    const client = new WHIPClient({
      endpoint: input.value,
      opts: { debug: true },
    });
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    ingest(client, mediaStream);
  });

  ingestScreen.addEventListener("click", async () => {
    const client = new WHIPClient({
      endpoint: input.value,
      opts: { debug: true },
    });
    const mediaStream = await navigator.mediaDevices.getDisplayMedia();
    ingest(client, mediaStream);
  });
});
