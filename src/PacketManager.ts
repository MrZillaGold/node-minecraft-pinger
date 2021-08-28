import * as varint from 'varint';

import { IParsedServer } from './interfaces';

export class PacketManager {

    hostname: IParsedServer['hostname'];
    port: IParsedServer['port'];

    constructor({ hostname, port }: IParsedServer) {
        this.hostname = hostname;
        this.port = port;
    }

    createPacket(packetId: number, data: Buffer): Buffer {
        return Buffer.concat([
            Buffer.from(varint.encode(varint.encodingLength(packetId) + data.length)),
            Buffer.from(varint.encode(packetId)),
            data
        ]);
    }

    createHandshakePacket(): Buffer {
        const portBuffer = Buffer.alloc(2);

        portBuffer.writeUInt16BE(this.port, 0);

        // Return hansdhake packet with request packet https://wiki.vg/Server_List_Ping#Handshake
        return this.createPacket(0, Buffer.concat([
            Buffer.from(varint.encode(-1)), // Protocol version
            Buffer.from(varint.encode(this.hostname.length)), // Hostname Length
            Buffer.from(this.hostname, 'utf8'), // Hostname
            portBuffer, // Port
            Buffer.from(varint.encode(1)) // Next State
        ]));
    }

    createPingPacket(timestamp: number): Buffer {
        const timestampBuffer = Buffer.allocUnsafe(8);

        timestampBuffer.writeBigInt64BE(BigInt(timestamp), 0);

        return this.createPacket(1, timestampBuffer);
    }

    createEmptyPacket(): Buffer {
        return this.createPacket(0, Buffer.alloc(0));
    }
}
