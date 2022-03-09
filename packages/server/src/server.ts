import { WHIPEndpoint } from "./index";

const endpoint = new WHIPEndpoint();
endpoint.listen(process.env.PORT || 8000);
