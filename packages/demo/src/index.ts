import { WHIPClient, WHIPClientOptions } from "../../sdk/src/index";
import { getIceServers } from "./util";

let resourceCount = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, duration = 2500, action?: { label: string; onClick: () => void }) {
  const toast = document.querySelector<HTMLDivElement>("#toast");
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.innerHTML = '';

  if (action) {
    // The toast itself becomes position:relative via .has-action
    // X button: absolutely positioned top-right
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'toast-close-btn';
    closeBtn.onclick = () => {
      toast.classList.remove('visible', 'has-action');
    };

    // Content wrapper: holds message + buttons, has right padding so text doesn't go under X
    const content = document.createElement('div');
    content.className = 'toast-content';

    const msg = document.createElement('span');
    msg.className = 'toast-msg';
    msg.textContent = message;
    content.appendChild(msg);

    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'toast-buttons';
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.className = 'toast-action-btn';
    btn.onclick = () => {
      toast.classList.remove('visible', 'has-action');
      action.onClick();
    };
    buttonsRow.appendChild(btn);
    content.appendChild(buttonsRow);

    toast.appendChild(closeBtn);   // absolute, outside content flow
    toast.appendChild(content);    // block content
    toast.classList.add('has-action');
    toast.classList.add('visible');
    // no setTimeout — stays until closed
  } else {
    const msg = document.createElement('span');
    msg.textContent = message;
    toast.appendChild(msg);

    toast.classList.add('visible');
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.remove('has-action');
    }, duration);
  }
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

async function createResourceCard(client: WHIPClient, endpointUrl: string, clientOpts: WHIPClientOptions): Promise<HTMLElement> {
  const card = document.createElement("div");
  card.className = "resource-card";
  card.title = endpointUrl;

  // Header row: live dot + URL + delete button
  const header = document.createElement("div");
  header.className = "resource-card-header";

  const dot = document.createElement("span");
  dot.className = "live-dot";

  const urlSpan = document.createElement("span");
  urlSpan.className = "resource-url";
  await client.getResourceUrl();
  const lastSegment = endpointUrl.split('/').filter(Boolean).pop() ?? endpointUrl;
  urlSpan.textContent = lastSegment;
  urlSpan.title = endpointUrl;

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
      const videoEl = document.querySelector<HTMLVideoElement>("video#ingest");
      if (videoEl) { videoEl.srcObject = null; videoEl.controls = false; }
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

async function ingest(client: WHIPClient, mediaStream: MediaStream, endpointUrl: string, clientOpts: WHIPClientOptions) {
  const videoEl = document.querySelector<HTMLVideoElement>("video#ingest");
  const placeholder = document.querySelector<HTMLElement>("#video-placeholder");
  const resourceList = document.querySelector<HTMLElement>("#resource-list");

  setStatus("connecting");

  videoEl.srcObject = mediaStream;
  videoEl.controls = true;
  if (placeholder) placeholder.classList.add("hidden");

  // Register before ingest() so early failures are caught.
  // cardRef is populated after the card is created below.
  let cardRef: HTMLElement | null = null;

  client.on('connectionfailed', () => {
    if (cardRef) cardRef.remove();
    resourceCount--;
    updateResourceCount();
    if (resourceCount === 0) {
      setStatus('idle');
      if (videoEl) { videoEl.srcObject = null; videoEl.controls = false; }
      if (placeholder) placeholder.classList.remove('hidden');
    }
    showToast(`Stream disconnected: ${endpointUrl}`, 8000, {
      label: 'Reconnect',
      onClick: async () => {
        try {
          setStatus('connecting');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          const newClient = new WHIPClient({ endpoint: endpointUrl, opts: clientOpts });
          await ingest(newClient, stream, endpointUrl, clientOpts);
        } catch (e) {
          console.error('Reconnect failed', e);
          showToast('Reconnect failed — please try again manually');
          setStatus('idle');
        }
      },
    });
  });

  await client.ingest(mediaStream);

  setStatus("live");
  resourceCount++;
  updateResourceCount();

  const card = await createResourceCard(client, endpointUrl, clientOpts);
  cardRef = card;
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
    const opts: WHIPClientOptions = {
      debug,
      iceServers: getIceServers(),
      authkey: getAuthKey(),
      noTrickleIce: paramNoTrickleIce.checked,
    };
    const client = await createClient(input.value, iceConfigRemote, opts);
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    ingest(client, mediaStream, input.value, opts);
  });

  ingestScreen.addEventListener("click", async () => {
    const opts: WHIPClientOptions = {
      debug,
      iceServers: getIceServers(),
      authkey: getAuthKey(),
      noTrickleIce: paramNoTrickleIce.checked,
    };
    const client = await createClient(input.value, iceConfigRemote, opts);
    const mediaStream = await navigator.mediaDevices.getDisplayMedia();
    ingest(client, mediaStream, input.value, opts);
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
