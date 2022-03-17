import { WHIPEndpoint } from "./index";
import { Broadcaster } from "./broadcaster/index";

const broadcaster = new Broadcaster();
broadcaster.listen(process.env.BROADCAST_PORT || 8001);

const endpoint = new WHIPEndpoint(broadcaster);
endpoint.listen(process.env.PORT || 8000);

