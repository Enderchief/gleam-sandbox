import { entries } from 'streaming-tar';
import { connect } from '@planetscale/database';
import { z } from 'zod';

export const config = {};

export class Client {
  #repo = 'https://repo.hex.pm/';
  /** @type {import('@planetscale/database').Connection} */
  db;
  constructor() {
    this.db = connect({
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
    });
  }

  /**
   * @param {string} name
   * @param {string} version
   * @returns {Promise<Record<string, string>>}
   */
  async fetch_files(name, version) {
    const res = await this.db.execute(
      `SELECT body from packages WHERE name = ? AND version = ?`,
      [name, version]
    );
    if (res.rows.length) {
      // @ts-ignore: ok
      const parsed = JSON.parse(res.rows[0].body);
      /** @type {Record<string, string>} */
      return parsed;
    }

    const path = `tarballs/${name}-${version}.tar`;

    const rawData = await fetch(`${this.#repo}${path}`);

    if (!rawData.ok) throw Error(rawData.status.toString());

    /** @type {Record<string, string>} */
    const structure = {};

    for await (const entry of entries(rawData.body)) {
      if (entry.name === 'contents.tar.gz') {
        const tarball = entry.body;
        const stream = tarball.pipeThrough(new DecompressionStream('gzip'));
        for await (const e of entries(stream)) {
          structure[e.name] = await e.text();
        }
      } else {
        await entry.skip();
      }
    }

    const out = Object.fromEntries(
      Object.entries(structure).map(([k, v]) => [
        `/build/packages/${name}/${k}`,
        v,
      ])
    );

    await this.db.execute(
      `INSERT INTO packages (name, version, body) VALUES (?, ?, ?)`,
      [name, version, JSON.stringify(out)]
    );

    return out;
  }
}

const client = new Client();

const schema = z.record(z.string());

/**
 * @param {import("@vercel/node").VercelRequest} request
 * @param {import("@vercel/node").VercelResponse} response
 * @return {undefined}
 */
export default async function (request, response) {
  const contentType = request.headers['content-type'];
  if (contentType !== 'application/json')
    return response.json({
      error: `invalid content type "${contentType}", expecting "application/json"`,
    });

  try {
    const rawData = await request.body
    console.log(typeof rawData, rawData);
    const data = schema.safeParse(rawData);
    if (!data.success)
      return response.json({
        error: data.error.toString(),
        type: 'validation',
      });

    const dependencies = Object.fromEntries(
      await Promise.all(
        Object.entries(data.data).map(async ([name, version]) => {
          let _temp = await client.fetch_files(name, version);
          /** @type {[string, Record<string, string>]} */
          let ret = [`${name}@${version}`, _temp];
          return ret;
        })
      )
    );
    return response.json(dependencies);
    // return json(dependencies);
  } catch (e) {
    return response.json({ error: `${e}`, type: 'api' });
  }

  //   return json({ error: 'this code should not be here', type: 'server' });
}

/**
 * @param {any} o
 * @param {ResponseInit} init
 * @returns {Response}
 */
function json(o, init) {
  return new Response(JSON.stringify(o), {
    headers: { 'content-type': 'application/json' },
    status: init?.status,
  });
}
