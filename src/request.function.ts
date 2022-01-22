import { URL } from 'url'
import { IpfsClusterClient } from './ipfs-cluster.client'
import { RequestOptions } from './types'
import axios, { AxiosRequestConfig } from 'axios'
import { Utils } from './utils'

/**
 * streaming data with axios
 * https://maximorlov.com/send-a-file-with-axios-in-nodejs/
 *
 * Multipart boundary data
 * https://stackoverflow.com/questions/3508338/what-is-the-boundary-in-multipart-form-data
 */

/**
 *
 * @param {API.Config} clusterClient
 * @param {string} path
 * @param {Object} [options]
 * @param {string} [options.method]
 * @param {Record<string, string|number|boolean|null|undefined>} [options.params]
 * @param {BodyInit} [options.body]
 * @param {AbortSignal} [options.signal]
 */
export async function request(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  options?: RequestOptions,
) {
  const endpoint = new URL(path, baseUrl)
  for (const [key, value] of Object.entries(options?.params || {})) {
    if (value != null) {
      endpoint.searchParams.set(key, String(value))
    }
  }

  const config: AxiosRequestConfig = {
    method: options?.method,
    url: endpoint.href,
    data: options?.body,
    headers,
    signal: options?.signal,
  }

  try {
    const response = await axios(config)

    return response.data
  } catch (err) {
    Utils.logAxiosError(err)
    throw err
  }
}
