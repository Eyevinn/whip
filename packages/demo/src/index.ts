import { WHIPClient, WHIPClientOptions } from "../../sdk/src/index";
import { getIceServers } from "./util";

async function createClientItem(client: WHIPClient) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const extensions = document.createElement("ul");
  const deleteBtn = document.createElement("button");

  summary.innerText = await client.getResourceUrl();

  const links = await client.getResourceExtensions();
  links.filter(v => v.match(/urn:ietf:params:whip:/) || v.match(/urn:mpeg:dash:schema:mpd/)).forEach(l => {
    const m = l.match(/<?([^>]*)>;\s*rel=([^;]*)/);
    if (m) {
      const [_, u, rel] = m;

      const link = document.createElement("li");
      const url = new URL(u);
      if (rel === "urn:ietf:params:whip:whpp") {
        const playerUrl = new URL("https://web.player.eyevinn.technology");
        playerUrl.searchParams.append("manifest", url.href);
        link.innerHTML = `<a target="_blank" href="${playerUrl.href}">${url.href}</a> (${rel})`;
      } else {
        link.innerHTML = `<a target="_blank" href="${url.href}">${url.href}</a> (${rel})`;
      }
      extensions.appendChild(link);
    }
  });

  deleteBtn.innerText = "Delete";
  deleteBtn.onclick = async () => { 
    await client.destroy();
    details.parentNode?.removeChild(details);
  }

  details.appendChild(summary);
  details.appendChild(extensions);
  details.appendChild(deleteBtn);

  return details;
}

async function ingest(client: WHIPClient, mediaStream: MediaStream) {
  const resources =
    document.querySelector<HTMLDivElement>("#resources");
  const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");

  videoIngest.srcObject = mediaStream;
  await client.ingest(mediaStream);

  resources.appendChild(await createClientItem(client));
}

async function createClient(url: string, iceConfigRemote: boolean, opts: WHIPClientOptions) {
  const client = new WHIPClient({
    endpoint: url,
    opts: opts,
  });
  if (iceConfigRemote) {
    await client.setIceServersFromEndpoint();
  }

  return client;
}

function getAuthKey() {
  let authkey;

  const paramAuthorization =
    document.querySelector<HTMLInputElement>("#param-auth");

  if (paramAuthorization && paramAuthorization.value) {
    authkey = paramAuthorization.value;
  } else {
    if (process.env.NODE_ENV === "development") {
      authkey = "devkey";
    } else if (process.env.NODE_ENV === "awsdev") {
      authkey = process.env.API_KEY;
    } else {
      authkey = process.env.API_KEY;
    }
  }

  return authkey;
}

window.addEventListener("DOMContentLoaded", async () => {

  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const ingestCamera =
    document.querySelector<HTMLButtonElement>("#ingest-camera");
  const ingestScreen =
    document.querySelector<HTMLButtonElement>("#ingest-screen");

  const paramChannelId =
    document.querySelector<HTMLInputElement>("#param-channel-id");

  const paramB64Json =
    document.querySelector<HTMLInputElement>("#param-b64json");

  const paramNoTrickleIce =
    document.querySelector<HTMLInputElement>("#param-no-trickleice");

  if (process.env.NODE_ENV === "development") {
    const protocol = process.env.TLS_TERMINATION_ENABLED ? "https" : "http";
    input.value = `${protocol}://${window.location.hostname}:8000/api/v2/whip/sfu-broadcaster`;
  } else if (process.env.NODE_ENV === "awsdev") {
    input.value = "https://whip.dev.eyevinn.technology/api/v1/whip/broadcaster";
  } else {
    input.value = "https://broadcaster-whip.prod.eyevinn.technology/api/v1/whip/broadcaster";
  }
  
  const debug = process.env.NODE_ENV === "development" || !!process.env.DEBUG;
  const iceConfigRemote = !!(process.env.ICE_CONFIG_REMOTE);

  function updateThisUrl() {
    const url = new URL(window.location.href);
    input.value && url.searchParams.set("endpoint", input.value);
    document.querySelector<HTMLInputElement>("#thisurl").value = url.toString();
  }

  const url = new URL(window.location.href);
  if (url.searchParams.has("endpoint")) {
    input.value = url.searchParams.get("endpoint");
    const endpointUrl = new URL(input.value);
    paramChannelId.value = endpointUrl.searchParams.get("channelId");
    if (endpointUrl.searchParams.has("b64json")) {
      paramB64Json.value = Buffer.from(endpointUrl.searchParams.get("b64json"), "base64").toString();
    }
  }
  updateThisUrl();

  ingestCamera.addEventListener("click", async () => {
    const client = await createClient(input.value, iceConfigRemote, { 
      debug: debug, iceServers: getIceServers(), authkey: getAuthKey(), 
      noTrickleIce: paramNoTrickleIce.checked }
    );
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    ingest(client, mediaStream);
  });

  ingestScreen.addEventListener("click", async () => {
    const client = await createClient(input.value, iceConfigRemote, { 
      debug: debug, iceServers: getIceServers(), authkey: getAuthKey(), 
      noTrickleIce: paramNoTrickleIce.checked }
    );
    const mediaStream = await navigator.mediaDevices.getDisplayMedia();
    ingest(client, mediaStream);
  });

  paramChannelId.addEventListener("change", () => {
    const url = new URL(input.value);
    if (!paramChannelId.value) {
      url.searchParams.delete("channelId");
    } else {
      url.searchParams.set("channelId", paramChannelId.value);
    }
    input.value = url.toString();
    updateThisUrl();
  });

  paramB64Json.addEventListener("change", () => {
    const url = new URL(input.value);
    if (!paramB64Json.value) {
      url.searchParams.delete("b64json");
    } else {
      const b64json = Buffer.from(paramB64Json.value, "utf-8").toString("base64");
      url.searchParams.set("b64json", b64json);
    }
    input.value = url.toString();
    updateThisUrl();
  });

  input.addEventListener("change", () => {
    updateThisUrl();
  });
});
