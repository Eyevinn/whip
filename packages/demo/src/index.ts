import { WHIPClient, WHIPClientOptions } from "../../sdk/src/index";
import { getIceServers } from "./util";

let resourceCount = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, duration = 2500) {
  const toast = document.querySelector<HTMLDivElement>("#toast");
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), duration);
}

function setStatus(state: "idle" | "connecting" | "live") {
  const pill = document.querySelector<HTMLElement>("#status-pill");
  const label = document.querySelector<HTMLElement>("#status-label");
  if (!pill || !label) return;
  pill.className = "status-pill" + (state !== "idle" ? " " + state : "");
  label.textContent = state === "idle" ? "Idle" : state === "connecting" ? "Connecting…" : "Live";
}

function updateResourceCount() {
  const countEl = document.querySelector<HTMLElement>("#resource-count");
  const emptyEl = document.querySelector<HTMLElement>("#empty-state");
  if (countEl) countEl.textContent = String(resourceCount);
  if (emptyEl) emptyEl.style.display = resourceCount === 0 ? "flex" : "none";
}

async function createResourceCard(client: WHIPClient): Promise<HTMLElement> {
  const card = document.createElement("div");
  card.className = "resource-card";

  // Header row: live dot + URL + delete button
  const header = document.createElement("div");
  header.className = "resource-card-header";

  const dot = document.createElement("span");
  dot.className = "live-dot";

  const urlSpan = document.createElement("span");
  urlSpan.className = "resource-url";
  const resourceUrl = await client.getResourceUrl();
  urlSpan.textContent = resourceUrl;
  urlSpan.title = resourceUrl;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-danger-sm";
  deleteBtn.textContent = "Delete";
  deleteBtn.onclick = async () => {
    await client.destroy();
    card.remove();
    resourceCount--;
    updateResourceCount();
    if (resourceCount === 0) {
      setStatus("idle");
      const placeholder = document.querySelector<HTMLElement>("#video-placeholder");
      if (placeholder) placeholder.classList.remove("hidden");
    }
    showToast("Resource deleted");
  };

  header.appendChild(dot);
  header.appendChild(urlSpan);
  header.appendChild(deleteBtn);
  card.appendChild(header);

  // Extension links
  const links = await client.getResourceExtensions();
  const filtered = links.filter(
    (v) => v.match(/urn:ietf:params:whip:/) || v.match(/urn:mpeg:dash:schema:mpd/)
  );

  if (filtered.length > 0) {
    const linksDiv = document.createElement("div");
    linksDiv.className = "resource-links";

    filtered.forEach((l) => {
      const m = l.match(/<?([^>]*)>;\s*rel=([^;]*)/);
      if (m) {
        const [_, u, rel] = m;
        const row = document.createElement("div");
        row.className = "resource-link-row";

        const url = new URL(u);
        const a = document.createElement("a");
        a.target = "_blank";
        a.rel = "noopener";

        if (rel === "urn:ietf:params:whip:whpp") {
          const playerUrl = new URL("https://web.player.eyevinn.technology");
          playerUrl.searchParams.append("manifest", url.href);
          a.href = playerUrl.href;
        } else {
          a.href = url.href;
        }
        a.textContent = url.href;

        const relBadge = document.createElement("span");
        relBadge.className = "rel-badge";
        relBadge.textContent = rel.replace("urn:ietf:params:whip:", "").replace("urn:mpeg:dash:schema:", "");

        row.appendChild(a);
        row.appendChild(relBadge);
        linksDiv.appendChild(row);
      }
    });

    card.appendChild(linksDiv);
  }

  return card;
}

async function ingest(client: WHIPClient, mediaStream: MediaStream) {
  const videoEl = document.querySelector<HTMLVideoElement>("video#ingest");
  const placeholder = document.querySelector<HTMLElement>("#video-placeholder");
  const resourceList = document.querySelector<HTMLElement>("#resource-list");

  setStatus("connecting");

  videoEl.srcObject = mediaStream;
  if (placeholder) placeholder.classList.add("hidden");

  await client.ingest(mediaStream);

  setStatus("live");
  resourceCount++;
  updateResourceCount();

  const card = await createResourceCard(client);
  resourceList.appendChild(card);

  showToast("Stream started successfully");
}

async function createClient(url: string, iceConfigRemote: boolean, opts: WHIPClientOptions) {
  const client = new WHIPClient({ endpoint: url, opts });
  if (iceConfigRemote) {
    await client.setIceServersFromEndpoint();
  }
  return client;
}

function getAuthKey(): string | undefined {
  const el = document.querySelector<HTMLInputElement>("#param-auth");
  if (el && el.value) return el.value;
  if (process.env.NODE_ENV === "development") return "devkey";
  return process.env.API_KEY;
}

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const ingestCamera = document.querySelector<HTMLButtonElement>("#ingest-camera");
  const ingestScreen = document.querySelector<HTMLButtonElement>("#ingest-screen");
  const paramChannelId = document.querySelector<HTMLInputElement>("#param-channel-id");
  const paramB64Json = document.querySelector<HTMLInputElement>("#param-b64json");
  const paramNoTrickleIce = document.querySelector<HTMLInputElement>("#param-no-trickleice");
  const shareBtn = document.querySelector<HTMLButtonElement>("#share-btn");

  // Set default endpoint
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

  function getShareUrl(): string {
    const url = new URL(window.location.href);
    if (input.value) url.searchParams.set("endpoint", input.value);
    return url.toString();
  }

  // Load endpoint + params from URL
  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.has("endpoint")) {
    input.value = pageUrl.searchParams.get("endpoint");
    try {
      const endpointUrl = new URL(input.value);
      if (paramChannelId) paramChannelId.value = endpointUrl.searchParams.get("channelId") ?? "";
      if (paramB64Json && endpointUrl.searchParams.has("b64json")) {
        paramB64Json.value = Buffer.from(endpointUrl.searchParams.get("b64json"), "base64").toString();
      }
    } catch {
      // invalid URL, leave fields empty
    }
  }

  // Share button: copy URL to clipboard
  shareBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(getShareUrl()).then(
      () => showToast("Share URL copied to clipboard"),
      () => showToast("Could not access clipboard")
    );
  });

  ingestCamera.addEventListener("click", async () => {
    const client = await createClient(input.value, iceConfigRemote, {
      debug,
      iceServers: getIceServers(),
      authkey: getAuthKey(),
      noTrickleIce: paramNoTrickleIce.checked,
    });
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    ingest(client, mediaStream);
  });

  ingestScreen.addEventListener("click", async () => {
    const client = await createClient(input.value, iceConfigRemote, {
      debug,
      iceServers: getIceServers(),
      authkey: getAuthKey(),
      noTrickleIce: paramNoTrickleIce.checked,
    });
    const mediaStream = await navigator.mediaDevices.getDisplayMedia();
    ingest(client, mediaStream);
  });

  paramChannelId?.addEventListener("change", () => {
    try {
      const url = new URL(input.value);
      if (!paramChannelId.value) {
        url.searchParams.delete("channelId");
      } else {
        url.searchParams.set("channelId", paramChannelId.value);
      }
      input.value = url.toString();
    } catch { /* ignore invalid URL */ }
  });

  paramB64Json?.addEventListener("change", () => {
    try {
      const url = new URL(input.value);
      if (!paramB64Json.value) {
        url.searchParams.delete("b64json");
      } else {
        url.searchParams.set("b64json", Buffer.from(paramB64Json.value, "utf-8").toString("base64"));
      }
      input.value = url.toString();
    } catch { /* ignore invalid URL */ }
  });

  updateResourceCount();
});
