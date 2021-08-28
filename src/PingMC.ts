import * as net from 'net';
import * as dns from 'dns';

import { PacketDecoder } from './PacketDecoder';
import { PacketManager } from './PacketManager';

import { IParsedServer, IResult } from './interfaces';

export class PingMC {

  readonly timeout: number;
  readonly server: IParsedServer;

  constructor(ip: string, timeout = 5 * 1000) {
      this.server = PingMC.parseIP(ip);

      this.timeout = timeout;
  }

  async ping(): Promise<IResult> {
      const srv = await this.checkSrvRecord()
          .catch(() => null);

      return new Promise((resolve, reject) => {
          this.openConnection(srv || this.server)
              .then(resolve)
              .catch(reject);
      });
  }

  private static parseIP(ip: string): IParsedServer {
      const hasPort = ip.match(/([^]+):([\d]+)/);

      return {
          hostname: hasPort ? hasPort[1] : ip,
          port: hasPort ? Number(hasPort[2]) : 25565
      };
  }

  private checkSrvRecord(): Promise<IParsedServer> {
      const server = this.server;

      return new Promise((resolve, reject) => {
          dns.resolveSrv(`_minecraft._tcp.${server.hostname}`, (error, result) => {
              if (error) {
                  return reject(error);
              }

              if (!result) {
                  return reject(
                      new Error('Empty result')
                  );
              } else {
                  if (result.length === 0) {
                      return resolve(server);
                  }

                  const [{ name: hostname, port }] = result;

                  return resolve({
                      hostname,
                      port
                  });
              }
          });
      });
  }

  private openConnection({ hostname, port }: IParsedServer): Promise<IResult> {
      return new Promise((resolve, reject) => {
          const connection = net.createConnection(port, hostname, () => {
              // Decode incoming packets
              const packetDecoder = new PacketDecoder();
              const packetManager = new PacketManager({ hostname, port });

              connection.pipe(packetDecoder);

              // Write handshake packet
              connection.write(packetManager.createHandshakePacket());
              connection.write(packetManager.createEmptyPacket());

              packetDecoder.once('error', (error) => {
                  connection.destroy();
                  clearTimeout(timeout);

                  reject(error);
              });

              packetDecoder.once('packet', (data) => {
                  // Write ping packet
                  connection.write(packetManager.createPingPacket(Date.now()));

                  packetDecoder.once('packet', (ping) => {
                      connection.end();
                      clearTimeout(timeout);

                      data.ping = typeof ping === 'number' ?
                          ping
                          :
                          null;

                      resolve(data);
                  });
              });
          });

          // Destroy on error
          connection.once('error', (error) => {
              connection.destroy();
              clearTimeout(timeout);

              reject(error);
          });

          // Destroy on timeout
          connection.once('timeout', () => {
              connection.destroy();
              clearTimeout(timeout);

              reject(new Error('Timed out'));
          });

          // Packet timeout
          const timeout = setTimeout(() => {
              connection.end();

              reject(new Error('Timed out'));
          }, this.timeout);
      });
  }
}
