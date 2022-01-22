# ipfs-cluster-http-client

| :warning:  This project is pre-release and intended for testing purposes only |
|-----------------------------------------|

Node.js Library for interacting with the IPFS Cluster API (https://cluster.ipfs.io/documentation/reference/api/) for Node.js.

Adapted from https://github.com/nftstorage/ipfs-cluster.

# Usage

```ts
import { IpfsClusterClient } from '@cyphercider/ipfs-cluster-http-client'

const clusterClient = new IpfsClusterClient([ipfs swarm host], [optional username], [optional password])

// Example
const clusterClient = new IpfsClusterClient('http://localhost:9094', 'user', 'secret')
```

# Development

To run the tests, first run `docker-compose up -d` in the project root to start a local IPFS cluster.
