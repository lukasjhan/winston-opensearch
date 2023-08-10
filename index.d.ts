import { Client, ClientOptions, estypes } from '@opensearch-project/opensearch';
import TransportStream = require('winston-transport');

export interface LogData {
  message: any;
  level: string;
  meta: { [key: string]: any };
  timestamp?: string;
}

export interface Transformer {
  (logData: LogData): any;
}

export interface OpensearchTransportOptions extends TransportStream.TransportStreamOptions {
  timestamp?: () => string;
  level?: string;
  index?: string;
  indexPrefix?: string | Function;
  indexSuffixPattern?: string;
  transformer?: Transformer;
  useTransformer?: boolean;
  indexTemplate?: { [key: string]: any };
  ensureIndexTemplate?: boolean;
  flushInterval?: number;
  waitForActiveShards?: number | 'all';
  handleExceptions?: boolean;
  pipeline?: string;
  client?: Client;
  clientOpts?: ClientOptions;
  buffering?: boolean;
  bufferLimit?: number;
  healthCheckTimeout?: string;
  healthCheckWaitForStatus?: string;
  healthCheckWaitForNodes?: string;
  source?: string;
  retryLimit?: number;
}

export class OpensearchTransport extends TransportStream {
  constructor(opts?: OpensearchTransportOptions);
  flush(): Promise<any>;

  query<T>(options: any, callback?: () => void): Promise<estypes.SearchResponse<T>>;
  query<T>(q: string): Promise<estypes.SearchResponse<T>>;
  getIndexName(opts: OpensearchTransportOptions): string;
}

interface TransformedData {
  '@timestamp': string;
  message: string;
  severity: string;
  fields: string;
  transaction?: { id: string };
  trace?: { id: string };
  span?: { id: string };
}

export function OpensearchTransformer(logData: LogData): TransformedData;
