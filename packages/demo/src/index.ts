import { WHIPClient } from "@eyevinn/whip-web-client";

window.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const videoSender = document.querySelector<HTMLVideoElement>("video#sender");
  const videoReceiver = document.querySelector<HTMLVideoElement>("video#receiver");

  input.value = `http://${window.location.hostname}:8000/api/v1/whip/dummy`

  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: input.value,
        element: videoSender,
        opts: { debug: true },
      });

      await client.connect();
      const resourceUri = await client.getResourceUri();
      const response = await fetch("http://localhost:8000" + resourceUri);
      const json = await response.json();
      console.log(json.channel);

      // const channelSection = document.querySelector<HTMLTableSectionElement>("#channels");
      // const channelLink = document.createElement("a");
      // const searchParams = new URLSearchParams({ locator: json.channel });
      // channelLink.href = "/watch.html?" + searchParams.toString();
      // channelLink.innerHTML = "Watch";
      // channelLink.target = "_blank";
      // channelSection.appendChild(channelLink);
    });
});
