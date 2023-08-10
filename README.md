# winston-opensearch

transport for the [winston](https://github.com/winstonjs/winston) logging toolkit.

Most of code is from the [winston-elasticsearch](https://github.com/vanthome/winston-elasticsearch) version 0.17.3

## Features

- [logstash](https://www.elastic.co/products/logstash) compatible message structure.
- Thus consumable with [kibana](https://www.elastic.co/products/kibana).
- Date pattern based index names.
- Custom transformer function to transform logged data into a different message structure.
- Buffering of messages in case of unavailability of ES. The limit is the memory as all unwritten messages are kept in memory.

### Compatibility

I tested **Winston 3.8.2**, **Opensearch 2.7** for AWS usage.

## Installation

```sh
npm install --save winston winston-opensearch
```

## Usage

```js
const winston = require('winston');
const { OpensearchTransport } = require('winston-opensearch');

const esTransportOpts = {
  level: 'info',
};
const esTransport = new OpensearchTransport(esTransportOpts);
const logger = winston.createLogger({
  transports: [esTransport],
});
// Compulsory error handling
logger.on('error', (error) => {
  console.error('Error in logger caught', error);
});
esTransport.on('error', (error) => {
  console.error('Error in logger caught', error);
});
```

The [winston API for logging](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects)
can be used with one restriction: Only one JS object can only be logged and indexed as such.
If multiple objects are provided as arguments, the contents are stringified.

## Options

- `level` [`info`] Messages logged with a severity greater or equal to the given one are logged to ES; others are discarded.
- `index` [none | when `dataStream` is `true`, `logs-app-default`] The index to be used. This option is mutually exclusive with `indexPrefix`.
- `indexPrefix` [`logs`] The prefix to use to generate the index name according to the pattern `<indexPrefix>-<indexSuffixPattern>`. Can be string or function, returning the string to use.
- `indexSuffixPattern` [`YYYY.MM.DD`] a Day.js compatible date/ time pattern.
- `transformer` [see below] A transformer function to transform logged data into a different message structure.
- `useTransformer` [`true`] If set to `true`, the given `transformer` will be used (or the default). Set to `false` if you want to apply custom transformers during Winston's `createLogger`.
- `ensureIndexTemplate` [`true`] If set to `true`, the given `indexTemplate` is checked/ uploaded to ES when the module is sending the first log message to make sure the log messages are mapped in a sensible manner.
- `indexTemplate` [see file `index-template-mapping.json`] the mapping template to be ensured as parsed JSON.
  `ensureIndexTemplate` is `true` and `indexTemplate` is `undefined`
- `flushInterval` [`2000`] Time span between bulk writes in ms.
- `retryLimit` [`400`] Number of retries to connect to ES before giving up.
- `healthCheckTimeout` [`30s`] Timeout for one health check (health checks will be retried forever).
- `healthCheckWaitForStatus` [`yellow`] Status to wait for when check upon health. See [its API docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html) for supported options.
- `healthCheckWaitForNodes` [`>=1`] Nodes to wait for when check upon health. See [its API docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html) for supported options.
- `client` An [opensearch client](https://www.npmjs.com/package/@elastic/elasticsearch) instance. If given, the `clientOpts` are ignored.
- `clientOpts` An object passed to the ES client. See [its docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html) for supported options.
- `waitForActiveShards` [`1`] Sets the number of shard copies that must be active before proceeding with the bulk operation.
- `pipeline` [none] Sets the pipeline id to pre-process incoming documents with. See [the bulk API docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk).
- `buffering` [`true`] Boolean flag to enable or disable messages buffering. The `bufferLimit` option is ignored if set to `false`.
- `bufferLimit` [`null`] Limit for the number of log messages in the buffer.
- `source` [none] the source of the log message. This can be useful for microservices to understand from which service a log message origins.
- `internalLogger` [`console.error`] A logger of last resort to log internal errors.

### Logging of OpenSearch Client

The default client and options will log through `console`.

### Interdependencies of Options

When changing the `indexPrefix` and/or the `transformer`,
make sure to provide a matching `indexTemplate`.

## Transformer

The transformer function allows mutation of log data as provided
by winston into a shape more appropriate for indexing in Opensearch.

The default transformer generates a `@timestamp` and rolls any `meta`
objects into an object called `fields`.

Params:

- `logdata` An object with the data to log. Properties are:
  - `timestamp` [`new Date().toISOString()`] The timestamp of the log entry
  - `level` The log level of the entry
  - `message` The message for the log entry
  - `meta` The meta data for the log entry

Returns: Object with the following properties

- `@timestamp` The timestamp of the log entry
- `severity` The log level of the entry
- `message` The message for the log entry
- `fields` The meta data for the log entry

The default transformer function's transformation is shown below.

Input A:

```js
{
  "message": "Some message",
  "level": "info",
  "meta": {
    "method": "GET",
    "url": "/sitemap.xml",
    ...
  }
}
```

Output A:

```js
{
  "@timestamp": "2019-09-30T05:09:08.282Z",
  "message": "Some message",
  "severity": "info",
  "fields": {
    "method": "GET",
    "url": "/sitemap.xml",
    ...
  }
}
```

The default transformer can be imported and extended

### Example

```js
const { OpensearchTransformer } = require('winston-opensearch');
const esTransportOpts = {
  transformer: (logData) => {
    const transformed = OpensearchTransformer(logData);
    transformed.fields.customField = 'customValue';
    return transformed;
  },
};
const esTransport = new OpensearchTransformer(esTransportOpts);
```

Note that in current logstash versions, the only "standard fields" are
`@timestamp` and `@version`, anything else is just free.

A custom transformer function can be provided in the options initiation.

## Events

- `error`: in case of any error.

## Example

An example assuming default settings.

### Log Action

```js
logger.info('Some message', {});
```

Only JSON objects are logged from the `meta` field. Any non-object is ignored.

### Generated Message

The log message generated by this module has the following structure:

```js
{
  "@timestamp": "2019-09-30T05:09:08.282Z",
  "message": "Some log message",
  "severity": "info",
  "fields": {
    "method": "GET",
    "url": "/sitemap.xml",
    "headers": {
      "host": "www.example.com",
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "accept": "*/*",
      "accept-encoding": "gzip,deflate",
      "from": "googlebot(at)googlebot.com",
      "if-modified-since": "Tue, 30 Sep 2019 11:34:56 GMT",
      "x-forwarded-for": "66.249.78.19"
    }
  }
}
```

### Target Index

This message would be POSTed to the following endpoint:

    http://localhost:9200/logs-2019.09.30/log/

So the default mapping uses an index pattern `logs-*`.
