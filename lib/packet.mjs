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

import { Writable } from "stream";
import varint from "varint";
import Int64 from "node-int64";

const PROTOCOL_VERSION = 335 // Minecraft 1.12

const createHandshakePacket = (address, port) => {
  let portBuffer = Buffer.allocUnsafe(2)
  portBuffer.writeUInt16BE(port, 0)

  // Return hansdhake packet with request packet
  return Buffer.concat([
    createPacket(0, Buffer.concat([
      Buffer.from(varint.encode(PROTOCOL_VERSION)),
      Buffer.from(varint.encode(address.length)),
      Buffer.from(address, 'utf8'),
      portBuffer,
      Buffer.from(varint.encode(1))
    ])),
    createPacket(0, Buffer.alloc(0))
  ])
}

const createPingPacket = (timestamp) => {
  return createPacket(1, new Int64(timestamp).toBuffer())
}

function createPacket (packetId, data) {
  return Buffer.concat([
    Buffer.from(varint.encode(varint.encodingLength(packetId) + data.length)),
    Buffer.from(varint.encode(packetId)),
    data
  ])
}

const PacketDecoder = class PacketDecoder extends Writable {

  constructor (options) {
    super(options);
    this.buffer = Buffer.alloc(0);
  }

  _write (chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    decodePacket(this.buffer)
      .catch(_ => callback())
      .then(packet => {
        if (!packet) return;

        if (packet.id === 0) {
          return decodeHandshakeResponse(packet);
        } else if (packet.id === 1) {
          return decodePong(packet);
        }
      })
      .then(packet => {
        if (!packet) return;

        // Remove packet from internal buffer
        this.buffer = this.buffer.slice(packet.bytes);

        this.emit('packet', packet.result);
        callback();
      })
      .catch(callback);
  }

}

function decodePacket (buffer) {
  return new Promise((resolve, reject) => {
    // Decode packet length
    const packetLength = varint.decode(buffer, 0);
    if (packetLength === undefined) {
      return reject(new Error("Could not decode packetLength"));
    }

    // Check if packet is long enough
    if (buffer.length < varint.encodingLength(packetLength) + packetLength) {
      return reject(new Error("Packet is not complete"));
    }

    // Decode packet id
    const packetId = varint.decode(buffer, varint.encodingLength(packetLength))
    if (packetId === undefined) {
      return reject(new Error("Could not decode packetId"));
    }

    // Slice data
    const data = buffer.slice(
      varint.encodingLength(packetLength) +
      varint.encodingLength(packetId)
    );

    // Resolve
    resolve({
      id: packetId,
      bytes: varint.encodingLength(packetLength) + packetLength,
      data
    });
  });
}

function decodeHandshakeResponse(packet) {
  return new Promise(async (resolve) => {
    // Read json response field
    const responseLength = varint.decode(packet.data, 0);
    const response = packet.data.slice(
      varint.encodingLength(responseLength),
      varint.encodingLength(responseLength) + responseLength
    );

    packet.result = JSON.parse(response);

    const { players, description, version, favicon, modinfo } = packet.result;

    const ver = getVersion(packet.result.version.protocol);

    let serverInfo = {
      motd: {
        default: null,
        clear: null
      },
      players: {
        max: players.max,
        online: players.online,
        list: []
      },
      version: {
        protocol: version.protocol,
        major: ver,
        name: version.name !== ver ? version.name : null
      },
      favicon: {
        icon: favicon || null,
        data: favicon ? Buffer.from(favicon.replace("data:image/png;base64,", ""), "base64") : null
      },
      mods: {
        names: modinfo && modinfo.modList.length > 0 ? modinfo.modList.map(({modid}) => modid) : [],
        list: modinfo && modinfo.modList.length > 0 ? modinfo.modList : [],
      }
    };

    if (players.sample) { // Parse players list to normal format

      serverInfo.players.list = players.sample.filter(({name}) => name.match(/^[A-Za-z0-9_]{3,16}$/g)).map(item => item.name);

    } else {
      serverInfo.players.list = [];
    }

    if (description.text || description.extra) { // Parse motd to normal format
      if (description.text) serverInfo.motd.default = description.text;

      if (description.extra) {
        let text = "";

        await description.extra.forEach(item => text += item.text);

        serverInfo.motd.default = text;
      }
    } else {
      serverInfo.motd.default = description.text === "" ? "" : description;
    }

    serverInfo.motd.clear = serverInfo.motd.default.replace(/§./g, "");

    packet.result = serverInfo;

    resolve(packet);
  })
}

function decodePong(packet) {
  return new Promise((resolve) => {
    // Decode timestamp
    const timestamp = new Int64(packet.data);

    packet.result = Date.now() - timestamp;

    resolve(packet);
  })
}

function getVersion(protocol) {
  if (protocol >= 701) return "1.16"; // TODO: После релиза 1.16 дополнить версии

  if (protocol >= 576 && protocol <= 578) return "1.15.2";
  if (protocol >= 574 && protocol <= 575) return "1.15.1";
  if (protocol >= 550 && protocol <= 573) return "1.15";

  if (protocol >= 491 && protocol <= 498) return "1.14.4";
  if (protocol >= 486 && protocol <= 490) return "1.14.3";
  if (protocol >= 481 && protocol <= 485) return "1.14.2";
  if (protocol >= 478 && protocol <= 480) return "1.14.1";
  if (protocol >= 441 && protocol <= 477) return "1.14";

  if (protocol >= 402 && protocol <= 404) return "1.13.2";
  if (protocol >= 394 && protocol <= 401) return "1.13.1";
  if (protocol >= 341 && protocol <= 393) return "1.13";

  if (protocol >= 339 && protocol <= 340) return "1.12.2";
  if (protocol >= 336 && protocol <= 338) return "1.12.1";
  if (protocol >= 317 && protocol <= 335) return "1.12";

  if (protocol === 316) return "1.11.x";
  if (protocol >= 301 && protocol <= 315) return "1.11";

  if (protocol >= 201 && protocol <= 210) return "1.10.x";

  if (protocol >= 109 && protocol <= 110) return "1.9.x";
  if (protocol === 108) return "1.9.1";
  if (protocol >= 48 && protocol <= 107) return "1.9";

  if (protocol >= 6 && protocol <= 47) return "1.8.9";

  if (protocol >= 4 && protocol <= 5) return "1.7.10";
  if (protocol >= 0 && protocol <= 3) return "1.7.x";

  return null;
}

export { createHandshakePacket, createPingPacket, PacketDecoder };
