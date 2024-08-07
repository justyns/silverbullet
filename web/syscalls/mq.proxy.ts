import type { SysCallMapping } from "../../lib/plugos/system.ts";
import type { Client } from "../client.ts";
import { proxySyscalls } from "./util.ts";

export function mqProxySyscalls(client: Client): SysCallMapping {
  return proxySyscalls(client, [
    "mq.send",
    "mq.batchSend",
    "mq.ack",
    "mq.batchAck",
    "mq.getQueueStats",
  ]);
}
