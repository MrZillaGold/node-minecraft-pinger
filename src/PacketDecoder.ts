// @ts-ignore
import * as Int64 from "node-int64";
import * as varint from "varint";
import { Writable } from "stream";

import { Result } from "./Result";

import { IDecodedPacket, IPacket } from "./interfaces";

export class PacketDecoder extends Writable {

    buffer: Buffer;

    constructor() {
        super();

        this.buffer = Buffer.alloc(0);
    }

    decodePacket(buffer: Buffer): Promise<IPacket> {
        return new Promise((resolve, reject) => {
            // Decode packet length
            const packetLength = varint.decode(buffer, 0);
            if (packetLength === undefined) {
                return reject(
                    new Error("Could not decode packetLength")
                );
            }

            // Check if packet is long enough
            if (buffer.length < varint.encodingLength(packetLength) + packetLength) {
                return reject(
                    new Error("Packet is not complete")
                );
            }

            // Decode packet id
            const packetId = varint.decode(buffer, varint.encodingLength(packetLength));
            if (packetId === undefined) {
                return reject(
                    new Error("Could not decode packetId")
                );
            }

            // Slice data
            const data = buffer.slice(varint.encodingLength(packetLength) + varint.encodingLength(packetId));

            // Resolve
            resolve({
                id: packetId,
                bytes: varint.encodingLength(packetLength) + packetLength,
                data
            });
        });
    }

    decodeHandshakeResponse(packet: IPacket): IDecodedPacket {
        // Read json response field
        const responseLength = varint.decode(packet.data, 0);
        const response = JSON.parse(
            packet.data.slice(
                varint.encodingLength(responseLength),
                varint.encodingLength(responseLength) + responseLength
            )
                .toString()
        );

        return {
            ...packet,
            result: new Result(response)
                .parse()
        };
    }

    decodePong(packet: IPacket): IDecodedPacket {
        const timestamp = new Int64(packet.data)
            .toNumber();

        (packet as IDecodedPacket).result = Date.now() - timestamp;

        return packet as IDecodedPacket;
    }

    _write(chunk: Buffer, encoding: BufferEncoding, callback: () => void): void {
        this.buffer = Buffer.concat([this.buffer, chunk]);

        this.decodePacket(this.buffer)
            .then((packet) => {
                if (packet) {
                    switch (packet.id) {
                        case 0:
                            return this.decodeHandshakeResponse(packet);
                        case 1:
                            return this.decodePong(packet);
                    }
                }
            })
            .then((packet) => {
                if (packet) {
                    // Remove packet from internal buffer
                    this.buffer = this.buffer.slice(packet.bytes);

                    this.emit("packet", packet.result);
                }

                callback();
            })
            .catch(() => callback());
    }
}
