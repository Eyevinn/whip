import { WHIPClient, WHIPClientOptions } from "../../sdk/src/index";
import { getIceServers } from "./util";

const CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
const SCREEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

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

async function createResourceCard(client: WHIPClient, endpointUrl: string, clientOpts: WHIPClientOptions, captureType: 'camera' | 'screen', mediaStream: MediaStream): Promise<HTMLElement> {
  const card = document.createElement("div");
  card.className = "resource-card";
  card.title = endpointUrl;
  card.style.cursor = 'pointer';

  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const videoEl = document.querySelector<HTMLVideoElement>('video#ingest');
    if (videoEl) {
      videoEl.srcObject = mediaStream;
    }
    document.querySelectorAll('.resource-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });

  // Header row: capture icon + live dot + URL + delete button
  const header = document.createElement("div");
  header.className = "resource-card-header";

  const icon = document.createElement("span");
  icon.className = "capture-icon";
  icon.innerHTML = captureType === 'camera' ? CAMERA_SVG : SCREEN_SVG;

  const dot = document.createElement("span");
  dot.className = "live-dot";

  const urlSpan = document.createElement("span");
  urlSpan.className = "resource-url";
  await client.getResourceUrl();
  let label: string;
  try {
    const u = new URL(endpointUrl);
    const channelId = u.searchParams.get('channelId');
    if (channelId) {
      label = `Channel: ${channelId}`;
    } else {
      label = u.pathname.split('/').filter(Boolean).pop() ?? endpointUrl;
    }
  } catch {
    label = endpointUrl;
  }
  urlSpan.textContent = label;
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

  header.appendChild(icon);
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

function buildLoadingCard(endpointUrl: string, captureType: 'camera' | 'screen'): HTMLElement {
  const card = document.createElement("div");
  card.className = "resource-card loading";

  const header = document.createElement("div");
  header.className = "resource-card-header";

  const icon = document.createElement("span");
  icon.className = "capture-icon";
  icon.innerHTML = captureType === 'camera' ? CAMERA_SVG : SCREEN_SVG;

  const dot = document.createElement("span");
  dot.className = "connecting-dot";

  const urlSpan = document.createElement("span");
  urlSpan.className = "resource-url";
  try {
    const u = new URL(endpointUrl);
    const channelId = u.searchParams.get('channelId');
    urlSpan.textContent = channelId ? `Channel: ${channelId}` : (u.pathname.split('/').filter(Boolean).pop() ?? endpointUrl);
  } catch {
    urlSpan.textContent = endpointUrl;
  }

  const ghostBtn = document.createElement("button");
  ghostBtn.className = "btn-danger-sm";
  ghostBtn.textContent = "Delete";
  ghostBtn.style.visibility = "hidden";

  header.appendChild(icon);
  header.appendChild(dot);
  header.appendChild(urlSpan);
  header.appendChild(ghostBtn);
  card.appendChild(header);
  return card;
}

async function ingest(client: WHIPClient, mediaStream: MediaStream, endpointUrl: string, clientOpts: WHIPClientOptions, captureType: 'camera' | 'screen') {
  const videoEl = document.querySelector<HTMLVideoElement>("video#ingest");
  const placeholder = document.querySelector<HTMLElement>("#video-placeholder");
  const resourceList = document.querySelector<HTMLElement>("#resource-list");

  setStatus("connecting");

  // Show the local preview immediately while connecting.
  videoEl.srcObject = mediaStream;
  videoEl.controls = true;
  if (placeholder) placeholder.classList.add("hidden");

  // Show a loading card immediately so the count reflects the attempt.
  const loadingCard = buildLoadingCard(endpointUrl, captureType);
  resourceList.appendChild(loadingCard);
  resourceCount++;
  updateResourceCount();

  let cardRef: HTMLElement | null = null;

  client.on('connectionfailed', () => {
    if (cardRef) {
      cardRef.remove();
      resourceCount--;
      updateResourceCount();
    }
    if (resourceCount === 0) {
      setStatus('idle');
      if (videoEl) { videoEl.srcObject = null; videoEl.controls = false; }
      if (placeholder) placeholder.classList.remove('hidden');
    }
    showToast(`Stream disconnected`, 8000, {
      label: 'Reconnect',
      onClick: async () => {
        try {
          setStatus('connecting');
          const stream = captureType === 'screen'
            ? await navigator.mediaDevices.getDisplayMedia()
            : await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          const newClient = new WHIPClient({ endpoint: endpointUrl, opts: clientOpts });
          await ingest(newClient, stream, endpointUrl, clientOpts, captureType);
        } catch (e) {
          console.error('Reconnect failed', e);
          showToast('Reconnect failed — please try again manually');
          setStatus('idle');
        }
      },
    });
  });

  await client.ingest(mediaStream);

  // The SDK swallows HTTP errors silently — ingest() always resolves even on a 500.
  // For non-trickle ICE (which this server uses), sendOffer() is called from a
  // setTimeout *after* ingest() resolves, so we must wait long enough to cover
  // the full ICE gathering timeout + HTTP round-trip before declaring failure.
  const resourceUrl = await Promise.race([
    client.getResourceUrl().then(() => true),
    new Promise<false>(resolve => setTimeout(() => resolve(false), 15_000)),
  ]);

  if (!resourceUrl) {
    loadingCard.remove();
    resourceCount--;
    updateResourceCount();
    setStatus('idle');
    if (resourceCount === 0) {
      videoEl.srcObject = null;
      videoEl.controls = false;
      if (placeholder) placeholder.classList.remove("hidden");
    }
    showToast('Failed to connect — check the endpoint URL and try again', 6000);
    return;
  }

  // Connection succeeded — replace loading card with the real card.
  setStatus("live");

  const card = await createResourceCard(client, endpointUrl, clientOpts, captureType, mediaStream);
  cardRef = card;
  loadingCard.replaceWith(card);

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


  const debug = process.env.NODE_ENV === "development" || !!process.env.DEBUG;
  const iceConfigRemote = !!(process.env.ICE_CONFIG_REMOTE);

  function getShareUrl(): string {
    const url = new URL(window.location.href);
    if (input.value) url.searchParams.set("endpoint", input.value);
    return url.toString();
  }

  // Pre-fill endpoint from env var if no URL param overrides it
  if (!input.value && process.env.WHIP_URL_PLACEHOLDER) {
    input.value = process.env.WHIP_URL_PLACEHOLDER;
  }

  // Load endpoint + params from URL (overrides env var if present)
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
    ingest(client, mediaStream, input.value, opts, 'camera');
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
    ingest(client, mediaStream, input.value, opts, 'screen');
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
