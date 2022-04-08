import { WHIPClient } from "../../sdk/src/index";

import { getIceServers } from "./util";

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
    updateChannelList();
  }

  details.appendChild(summary);
  details.appendChild(deleteBtn);

  return details;
}

async function updateChannelList(channelListUrl?: string) {
  if (!channelListUrl) {
    return;
  }

  const channels = document.querySelector("#channels");
  channels.innerHTML = ""
  const response = await fetch(channelListUrl);
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
  let channelListUrl: string;
  (await client.getResourceExtensions()).forEach(link => {
    if (link.match(/rel=urn:ietf:params:whip:eyevinn-wrtc-channel-list/)) {
      channelListUrl = link.split(";")[0];      
    }
  });

  updateChannelList(channelListUrl);
}

function updateViewerCount(count) {
  const viewers =
    document.querySelector<HTMLSpanElement>("#viewers");
  viewers.innerHTML = `${count} viewer(s)`;
}

window.addEventListener("DOMContentLoaded", async () => {
  let viewers = 0;

  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const ingestCamera =
    document.querySelector<HTMLButtonElement>("#ingest-camera");
  const ingestScreen =
    document.querySelector<HTMLButtonElement>("#ingest-screen");

  let authkey;
  if (process.env.NODE_ENV === "development") {
    input.value = `http://${window.location.hostname}:8000/api/v1/whip/broadcaster`;
    authkey = "devkey";
  } else {
    input.value = "https://broadcaster-whip.prod.eyevinn.technology/api/v1/whip/broadcaster";
    authkey = process.env.API_KEY;
  }

  const debug = process.env.NODE_ENV === "development" || !!process.env.DEBUG;
  const iceConfigRemote = process.env.NODE_ENV === "development" || process.env.ICE_CONFIG_REMOTE;

  const client = new WHIPClient({
    endpoint: input.value,
    opts: { debug: debug, iceServers: getIceServers(), authkey: authkey },
  });
  if (iceConfigRemote) {
    await client.setIceServersFromEndpoint();
  }

  client.setupBackChannel();
  client.on("message", (data) => {
    const json = JSON.parse(data);
    if (!json.message && !json.message.event) {
      return;
    }
    switch (json.message.event) {
      case "vieweradd":
        viewers++;
        break;
      case "viewerremove":
        viewers--;
        break;
    }
    updateViewerCount(viewers);
  });

  ingestCamera.addEventListener("click", async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    ingest(client, mediaStream);
  });

  ingestScreen.addEventListener("click", async () => {
    const mediaStream = await navigator.mediaDevices.getDisplayMedia();
    ingest(client, mediaStream);
  });
});
