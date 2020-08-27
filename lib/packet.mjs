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

import { Result } from "./result.mjs";

const PROTOCOL_VERSION = 340 // Minecraft 1.12.2

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
  return new Promise(resolve => {
    // Read json response field
    const responseLength = varint.decode(packet.data, 0);
    const response = JSON.parse(
        packet.data.slice(
            varint.encodingLength(responseLength),
            varint.encodingLength(responseLength) + responseLength
        )
    );

    resolve({
      ...packet,
      result: {
        ...new Result(response)
            .parse()
      }
    })
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

export { createHandshakePacket, createPingPacket, PacketDecoder };
