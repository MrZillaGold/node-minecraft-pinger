import varint from "varint";
import Int64 from "node-int64";

export class PacketManager {

    constructor(hostname, port) {
        this.hostname = hostname;
        this.port = port;
    }

    createPacket(packetId, data) {
        return Buffer.concat([
            Buffer.from(varint.encode(varint.encodingLength(packetId) + data.length)),
            Buffer.from(varint.encode(packetId)),
            data
        ]);
    }

    createHandshakePacket() {
        const portBuffer = Buffer.alloc(2);

        portBuffer.writeInt16BE(this.port, 0);

        // Return hansdhake packet with request packet https://wiki.vg/Server_List_Ping#Handshake
        return this.createPacket(0, Buffer.concat([
            Buffer.from(varint.encode(-1)),
            Buffer.from(varint.encode(this.hostname.length)),
            Buffer.from(this.hostname, "utf8"),
            portBuffer,
            Buffer.from(varint.encode(1))
        ]));
    }

    createPingPacket(timestamp) {
        return this.createPacket(1, new Int64(timestamp).toBuffer())
    }

    createEmptyPacket() {
        return this.createPacket(0, Buffer.alloc(0));
    }
}
