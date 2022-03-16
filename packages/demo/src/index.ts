import { WHIPClient } from "@eyevinn/whip-web-client";

window.addEventListener("DOMContentLoaded", () => {
  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: document.querySelector<HTMLInputElement>("#whip-endpoint").value,
        element: document.querySelector<HTMLVideoElement>("video"),
      });
      await client.connect();
    });
});
