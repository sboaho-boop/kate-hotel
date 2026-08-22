declare module "qz-tray" {
  type QzDataItem = {
    type: string;
    format?: string;
    flavor?: string;
    data: string;
  };

  const qz: {
    security: {
      setCertificatePromise: (
        fn:
          | ((
              resolve: (cert: string) => void,
              reject: (err: Error) => void
            ) => void)
          | null
      ) => void;
      setSignaturePromise: (
        fn:
          | ((
              toSign: string
            ) => (resolve: (signature: string) => void) => void)
          | null
      ) => void;
    };
    websocket: {
      connect: (opts?: Record<string, unknown>) => Promise<unknown>;
      disconnect: () => Promise<unknown>;
      isActive: () => boolean;
    };
    printers: {
      find: (name?: string) => Promise<string | string[]>;
      getDefault: () => Promise<string>;
    };
    configs: {
      create: (
        printer?: string,
        opts?: Record<string, unknown>
      ) => Record<string, unknown>;
    };
    print: (config: Record<string, unknown>, data: QzDataItem[]) => Promise<void>;
  };

  export default qz;
}
