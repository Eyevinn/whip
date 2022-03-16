import { WHIPClient } from "@eyevinn/whip-web-client";

window.addEventListener("DOMContentLoaded", () => {
  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: document.querySelector<HTMLInputElement>("#whip-endpoint").value,
        element: document.querySelector<HTMLVideoElement>("video"),
        opts: { debug: true },
      });
      await client.connect();
      const resourceUri = await client.getResourceUri();
      const response = await fetch("http://localhost:8000" + resourceUri);
      const json = await response.json();
      console.log(json);

      const channelSection = document.querySelector<HTMLTableSectionElement>("#channels");
      const channelLink = document.createElement("a");
      const searchParams = new URLSearchParams({ locator: json.channel });
      channelLink.href = "/watch.html?" + searchParams.toString();
      channelLink.innerHTML = "Watch";
      channelLink.target = "_blank";
      channelSection.appendChild(channelLink);
    });
});
