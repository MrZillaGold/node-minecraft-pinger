import varint from "varint";
import Int64 from "node-int64";
import { Writable } from "stream";

import { Result } from "./Result.mjs";

export class PacketDecoder extends Writable {

    constructor (options) {
        super(options);

        this.buffer = Buffer.alloc(0);
    }

    decodePacket(buffer) {
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
            const packetId = varint.decode(buffer, varint.encodingLength(packetLength))
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

    decodeHandshakeResponse(packet) {
        // Read json response field
        const responseLength = varint.decode(packet.data, 0);
        const response = JSON.parse(
            packet.data.slice(
                varint.encodingLength(responseLength),
                varint.encodingLength(responseLength) + responseLength
            )
        );

        return {
            ...packet,
            result: {
                ...new Result(response)
                    .parse()
            }
        };
    }

    decodePong(packet) {
        const timestamp = new Int64(packet.data);

        packet.result = Date.now() - timestamp;

        return packet;
    }

    _write(chunk, encoding, callback) {
        this.buffer = Buffer.concat([this.buffer, chunk]);

        this.decodePacket(this.buffer)
            .then((packet) => {
                if (!packet) {
                    return;
                }

                switch (packet.id) {
                    case 0:
                        return this.decodeHandshakeResponse(packet);
                    case 1:
                        return this.decodePong(packet);
                }
            })
            .then((packet) => {
                // Remove packet from internal buffer
                this.buffer = this.buffer.slice(packet.bytes);

                this.emit("packet", packet.result);
                callback();
            })
            .catch(() => callback());
    }
}
