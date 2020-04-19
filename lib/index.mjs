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
import { PacketDecoder, createHandshakePacket, createPingPacket } from "./packet";

const ping = (ip, callback) => {
  const server = parseIP(ip);

  if (callback && typeof callback === "function") {
    checkSrvRecord(server.hostname)
      .then(openConnection, _ => openConnection(server))
      .then(data => callback(data, null))
      .catch(error => callback(null, error))
  } else {
    return new Promise((resolve, reject) => {
      ping(ip, (result, error) => {
        error ? reject(error) : resolve(result)
      })
    })
  }
}

function openConnection(address) {
  const { hostname, port } = address;

  return new Promise((resolve, reject) => {
    const connection = net.createConnection(port, hostname, () => {
      // Decode incoming packets
      const packetDecoder = new PacketDecoder();
      connection.pipe(packetDecoder);

      // Write handshake packet
      connection.write(createHandshakePacket(hostname, port));

      packetDecoder.once("error", error => {
        connection.destroy();
        clearTimeout(timeout);

        reject(error);
      });

      packetDecoder.once("packet", data => {
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

      reject(new Error("Timed out"));
    })

    // Packet timeout (5 seconds)
    let timeout = setTimeout(() => {
      connection.end();

      reject(new Error("Timed out (5 seconds passed)"));
    }, 5 * 1000);
  })
}

function checkSrvRecord(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolveSrv("_minecraft._tcp." + hostname, (error, result) => {
      if (error) return reject(error);

      if (!result) {
        return reject(new Error("Empty result"));
      } else {
        if (result.length === 0) return resolve(parseIP(hostname));

        return resolve({
          hostname: result[0].name,
          port: result[0].port
        });
      }
    })
  })
}

function parseIP(ip) {
  const ipMatch = ip.match(/([^]+):([\d]+)/);

  const hostname = ipMatch ? ipMatch[1] : ip;
  const port = ipMatch ? parseInt(ipMatch[2]) : 25565;

  return { hostname, port };
}

export {
  ping
};
