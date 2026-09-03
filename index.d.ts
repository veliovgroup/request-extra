export type HeaderValue = string | number | boolean | null | undefined;
export type BinaryData = Uint8Array & { toString(encoding?: string): string };

export interface WritableLike {
  destroyed?: boolean;
  path?: string;
  write(chunk: unknown, encoding?: string, callback?: (error?: Error | null) => void): unknown;
  end(chunk?: unknown, encoding?: string, callback?: (error?: Error | null) => void): unknown;
  destroy?(error?: Error): unknown;
}

export interface RequestOptions {
  url?: string;
  uri?: string;
  method?: string;
  auth?: string;
  form?: string | object;
  upload?: number;
  pipeTo?: WritableLike;
  headers?: Record<string, HeaderValue>;
  debug?: boolean;
  retry?: boolean;
  retries?: number;
  retryDelay?: number;
  retryMethods?: string[];
  retryMaxDelay?: number;
  retryJitter?: boolean;
  respectRetryAfter?: boolean;
  timeout?: number;
  keepAlive?: boolean;
  followRedirect?: boolean;
  maxRedirects?: number;
  badStatuses?: number[];
  isBadStatus?: (statusCode: number, badStatuses?: number[]) => boolean;
  rawBody?: boolean;
  noStorage?: boolean;
  wait?: boolean;
  proxy?: string | boolean;
  rejectUnauthorized?: boolean;
  rejectUnauthorizedProxy?: boolean;
  curlOptions?: Record<string, unknown>;
  curlFeatures?: Record<string, boolean>;
}

export type RequestInput = RequestOptions & ({ url: string } | { uri: string });

export interface RequestDefaultOptions extends Required<Omit<RequestOptions, 'url' | 'uri' | 'auth' | 'form' | 'upload' | 'pipeTo' | 'curlOptions' | 'curlFeatures'>> {
  headers: Record<string, HeaderValue>;
}

export interface Response {
  statusCode: number;
  status: number;
  body?: string | BinaryData;
  headers: Record<string, string | string[]>;
}

export interface ResponseError {
  code: number;
  status: number;
  errorCode: number;
  statusCode: number;
  message: string;
  name?: string;
  stack?: string;
  cause?: Error;
}

export type RequestCallback = (error?: ResponseError, response?: Response) => void;
export type DataCallback = (chunk: BinaryData) => void;
export type HeaderCallback = (chunk: BinaryData) => void;

export interface LibCurlRequest {
  sent: boolean;
  finished: boolean;
  opts: RequestDefaultOptions & RequestOptions;
  pipe(writableStream: WritableLike): this;
  onData(callback: DataCallback): this;
  onHeader(callback: HeaderCallback): this;
  send(): this;
  sendAsync(): Promise<Response>;
  abort(): this;
  abortAsync(): Promise<Response>;
}

export interface RequestFunction {
  (opts: RequestInput, cb?: RequestCallback): LibCurlRequest;
  defaultOptions: RequestDefaultOptions;
}

declare const request: RequestFunction;

export function requestAsync(opts: RequestInput & { wait: true }): Promise<LibCurlRequest>;
export function requestAsync(opts: RequestInput & { wait?: false }): Promise<Response>;
export function requestAsync(opts: RequestInput): Promise<Response | LibCurlRequest>;

export default request;
