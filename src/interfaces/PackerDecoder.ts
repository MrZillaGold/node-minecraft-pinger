import { IResult } from "./Result";

export interface IPacket {
    id: number;
    bytes: number;
    data: Buffer;
}

export interface IDecodedPacket extends IPacket {
    result: IResult | any;
}