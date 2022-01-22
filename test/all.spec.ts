import { CarWriter } from '@ipld/car'
import * as CBOR from '@ipld/dag-cbor'
import FormData from 'form-data'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { PassThrough, Readable } from 'stream'
import * as assert from 'uvu/assert'

import { IpfsClusterClient } from '../src'
import { TestUtils } from './test.utils'

// Object.assign(global, { fetch, File, Blob, FormData })

// To run tests locally make sure you have cluster running,
// which you can do by doing `docker-compose up -d` in the project root.
const config = {
  host: 'http://127.0.0.1:9094',
}

describe('should operate', () => {
  let clusterClient: IpfsClusterClient
  beforeEach(() => {
    clusterClient = new IpfsClusterClient(config.host, 'user', 'secret')
  })

  describe('version', () => {
    it('gets cluster version (static)', async () => {
      const version = await clusterClient.version(config)
      assertField({ version }, 'version')
    })

    it('gets cluster version (method)', async () => {
      const version = await clusterClient.version()
      assertField({ version }, 'version')
    })
  })

  describe('add', () => {
    it('adds a file with streamchannels false', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const result = await clusterClient.addFile(file, { streamChannels: false })
      assert.equal(result.name, file.name)
      assert.equal(result.cid, 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy')
      assert.equal(result.size, 3)
    })

    it('adds a file with streamchannels true', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const result = await clusterClient.addFile(file, { streamChannels: true })
      assert.equal(result.name, file.name)
      assert.equal(result.cid, 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy')
      assert.equal(result.size, 3)
    })

    it('add a file via static API', async () => {
      const file = TestUtils.getFileFromText('bar.txt', 'bar')
      const result = await clusterClient.addFile(file, config)
      assert.equal(result.name, file.name)
      assert.equal(result.cid, 'bafkreih43yvs5w5fnp2aqya7w4q75g24gogrb3sct2qe7lsvcg3i7p4pxe')
      assert.equal(result.size, 3)
    })

    it('cars files are added as any other binary file', async () => {
      const message = CBOR.encode({ hello: 'world' })
      const link = CID.createV1(CBOR.code, await sha256.digest(message))

      const dag = CBOR.encode({
        to: 'world',
        message: link,
      })
      const cid = CID.createV1(CBOR.code, await sha256.digest(dag))

      const { writer, out } = CarWriter.create([cid])
      const readable = Readable.from(out)

      const tunnel = new PassThrough()
      readable.pipe(tunnel)

      await writer.put({ cid, bytes: dag })
      await writer.put({ cid: link, bytes: message })
      await writer.close()

      const formData = new FormData()
      formData.append('file', tunnel, { contentType: 'application/car' })

      const result = await clusterClient.addFromFormData(formData)

      assert.equal(result.cid, 'bafkreiegp2z6crgmgywbndbozu5i7qmgwbkyom5pthjh7hlnbx53jr2ov4')
    })
  })

  describe('addDirectory', () => {
    it('adds a directory of files', async () => {
      const files = [
        TestUtils.getFileFromText('foo.txt', 'foo'),
        TestUtils.getFileFromText('bar.txt', 'bar'),
      ]
      const [foo, bar, dir] = await clusterClient.addDirectory(files)

      expect(foo.name).toEqual('foo.txt')
      expect(foo.size).toEqual(11)
      expect(foo.cid).toEqual('QmcJw6x4bQr7oFnVnF6i8SLcJvhXjaxWvj54FYXmZ4Ct6p')

      expect(bar.name).toEqual('bar.txt')
      expect(bar.size).toEqual(11)
      expect(bar.cid).toEqual('QmW3J3czdUzxRaaN31Gtu5T1U5br3t631b8AHdvxHdsHWg')

      expect(dir.name).toEqual('')
      expect(dir.size).toEqual(124)
      expect(dir.cid).toEqual('QmNyPqRLaWHmqonxyLTWahvLeTfViBXiDRG5dn5qHh2iFK')
    })
  })

  describe('pin', () => {
    it('pins a CID', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const { cid } = await clusterClient.addFile(file)
      const name = `name-${Date.now()}`
      const metadata = { meta: `test-${Date.now()}` }
      const result = await clusterClient.pin(cid, { name, metadata })
      assert.equal(result.cid, cid)
      assert.equal(result.name, name)
      assert.equal(result.metadata, metadata)
    })

    it('gets pin status', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const { cid } = await clusterClient.addFile(file)
      const status = await clusterClient.status(cid)

      assert.equal(status.cid, cid)
      for (const pinInfo of Object.values(status.peerMap)) {
        assert.ok(['pinning', 'pinned'].includes(pinInfo.status))
      }
    })
  })

  describe('allocation', () => {
    it('gets pin allocation', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const metadata = { meta: `test-${Date.now()}` }
      const { cid } = await clusterClient.addFile(file, { metadata })
      const allocation = await clusterClient.allocation(cid)
      assert.equal(allocation.metadata, metadata)
    })
  })

  describe('recover', () => {
    it('recovers an errored pin', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const { cid } = await clusterClient.addFile(file)
      const status = await clusterClient.recover(cid)

      assert.equal(status.cid, cid)
      for (const pinInfo of Object.values(status.peerMap)) {
        assert.ok(['pinning', 'pinned'].includes((pinInfo as any).status))
      }
    })
  })

  describe('unpin', () => {
    it('unpins a CID', async () => {
      const file = TestUtils.getFileFromText('foo.txt', 'foo')
      const { cid } = await clusterClient.addFile(file)
      const result = await clusterClient.unpin(cid)
      assert.ok(typeof result === 'object')
      // TODO: is there something we can assert on in the response?
    })
  })

  describe('metricNames', () => {
    it('gets metric names', async () => {
      const names = await clusterClient.metricNames()
      assert.ok(Array.isArray(names))
      names.forEach((n) => assert.equal(typeof n, 'string'))
    })
  })

  describe('info', () => {
    /**
     * @param {API.ClusterInfo} info
     */
    const assertInfo = (info: any) => {
      assertField(info, 'id')
      assertField(info, 'version')
      assert.equal(typeof info.commit, 'string')
      assertField(info, 'peerName')
      assertField(info, 'rpcProtocolVersion')
      assert.ok(Array.isArray(info.addresses), 'addresses is array')
      assert.ok(Array.isArray(info.clusterPeers), 'clusterPeers is an array')
      assert.ok(Array.isArray(info.clusterPeersAddresses), 'clusterPeersAddresses is array')

      const { ipfs } = info

      assertField(ipfs, 'id')
      assert.ok(ipfs.addresses)
      assert.equal(typeof info.version, 'string', 'version is a string')
      assert.ok(info.version.length > 0, 'version is non empty string')
    }

    it('gets cluster id (static)', async () => {
      const info = await clusterClient.info(config)
      assertInfo(info)
    })

    it('gets cluster version (method)', async () => {
      const info = await clusterClient.info()
      assertInfo(info)
    })
  })

  /**
   * @param {any} info
   * @param {string|number} key
   */
  const assertField = (info: any, key: any) => {
    const value = info[key]
    assert.equal(typeof value, 'string', `${key} is a string`)
    assert.ok(value.length || 0 > 0, `${key} is non empty string`)
  }
})
