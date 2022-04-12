import { getViewerCount, watch } from "./util";

function updateViewerCount(count) {
  document.querySelector<HTMLDivElement>("#viewercount").innerHTML = `${count} viewer${count > 1 ? "s" : ""}`;  
}

window.addEventListener("DOMContentLoaded", async () => {
  const searchParams = new URL(window.location.href).searchParams;
  const locator = searchParams.get("locator");

  if (locator) {
    const player = await watch(locator, document.querySelector<HTMLVideoElement>("video"));

    setTimeout(async () => {
      const viewerCount = await getViewerCount(locator);
      updateViewerCount(viewerCount);  
    }, 5000);

    player.on("message", (message) => {
      console.log(message);
      const json = JSON.parse(message);
      // message: { event: "viewerschange", viewercount: this.viewers.length },

      if (json.message.event === "viewerschange") {
        updateViewerCount(json.message.viewercount);
      }
    });

    const heartButton = document.querySelector<HTMLButtonElement>("#heart");
    heartButton.addEventListener("click", async () => {
      heartButton.classList.toggle("animate");
      player.send("reactions", {
        event: "reaction",
        reaction: "like",
      });

      setTimeout(() => {
        heartButton.classList.remove("animate");
      }, 5000);
    });
  }
}); 
