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
        // Return hansdhake packet with request packet https://wiki.vg/Server_List_Ping#Handshake
        return this.createPacket(0, Buffer.concat([
            Buffer.from(varint.encode(-1)), // Protocol version
            Buffer.from(varint.encode(this.hostname.length)), // Hostname Length
            Buffer.from(this.hostname, "utf8"), // Hostname
            Buffer.alloc(2).writeUInt16BE(this.port, 0), // Port
            Buffer.from(varint.encode(1)) // Next State
        ]));
    }

    createPingPacket(timestamp) {
        return this.createPacket(1, new Int64(timestamp).toBuffer())
    }

    createEmptyPacket() {
        return this.createPacket(0, Buffer.alloc(0));
    }
}
