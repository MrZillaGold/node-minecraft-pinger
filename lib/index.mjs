/*
 * The MIT License (MIT)
 * Copyright © 2016 Dennis Bruner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the “Software”), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import net from "net";
import dns from "dns";
import { PacketDecoder, createHandshakePacket, createPingPacket } from "./packet.mjs";

class PingMC {

  constructor(ip) {
    this.server = this.parseIP(ip);
  }

  ping() {
    const server = this.server;

    const { hostname } = server;

    return new Promise((resolve, reject) =>
      this.checkSrvRecord(hostname)
          .then(this.openConnection, _ => this.openConnection(server))
          .then(resolve)
          .catch(reject)
    )
  }

  parseIP(ip) {
    const match = ip.match(/([^]+):([\d]+)/);

    if (match) {
      const [, hostname, port] = match;

      return {
        hostname,
        port
      }
    } else {
      return {
        hostname: ip,
        port: 25565
      }
    }
  }

  checkSrvRecord() {
    const server = this.server;

    const { hostname } = server;

    return new Promise((resolve, reject) => {
      dns.resolveSrv(`_minecraft._tcp.${hostname}`, (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(
              new Error("Empty result")
          );
        } else {

          if (result.length === 0) {
            return resolve(server);
          }

          const [{ name, port }] = result;

          return resolve({
            hostname: name,
            port
          });
        }
      })
    })
  }

  openConnection({ hostname, port }) {
    return new Promise((resolve, reject) => {
      const connection = net.createConnection(port, hostname, () => {
        // Decode incoming packets
        const packetDecoder = new PacketDecoder();
        connection.pipe(packetDecoder);

        // Write handshake packet
        connection.write(createHandshakePacket(hostname, port));

        packetDecoder.once("error", (error) => {
          connection.destroy();
          clearTimeout(timeout);

          reject(error);
        });

        packetDecoder.once("packet", (data) => {
          // Write ping packet
          connection.write(createPingPacket(Date.now()));

          packetDecoder.once("packet", ping => {
            connection.end();
            clearTimeout(timeout);

            data.ping = typeof ping === "number" ? ping : null;

            resolve(data);
          });
        })
      })

      // Destroy on error
      connection.once("error", error => {
        connection.destroy();
        clearTimeout(timeout);

        reject(error);
      })

      // Destroy on timeout
      connection.once("timeout", () => {
        connection.destroy();
        clearTimeout(timeout);

        reject(
            new Error("Timed out")
        );
      })

      // Packet timeout (5 seconds)
      const timeout = setTimeout(() => {
        connection.end();

        reject(
            new Error("Timed out (5 seconds passed)")
        );
      }, 5 * 1000);
    })
  }
}

export {
  PingMC
}
