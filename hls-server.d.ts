declare module "http-attach" {
  import type { Server, IncomingMessage, ServerResponse } from "http";

  type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R
    ? R
    : any;

  type MiddlewareRequestListener<
    Request extends typeof IncomingMessage = typeof IncomingMessage,
    Response extends typeof ServerResponse = typeof ServerResponse
  > = (req: InstanceType<Request>, res: InstanceType<Response>, next: () => void) => void;

  export default function httpAttach(httpServer: Server, handler: MiddlewareRequestListener): void;
}

declare module "hls-server" {
  import type { Server } from "http";
  export interface FSProvider {
    exists(arg_1: any, arg_2: () => any): void;
    getSegmentStream(arg_1: any, arg_2: () => any): void;
    getManifestStream(arg_1: any, arg_2: () => any): void;
  }
  export interface HLSServerOptions {
    path?: string;
    dir?: string;
    debugPlayer?: boolean;
    provider?: FSProvider;
  }
  export default class HLSServer {
    constructor(server: Server, opts: HLSServerOptions);
    attach(server: Server, opts: HLSServerOptions): void;
  }
}
