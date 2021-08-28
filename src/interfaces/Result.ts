export interface IResult {
    motd: IMotd;
    players: IPlayers;
    favicon: IFavicon;
    mods: IMods;
    version: IVersion;
    ping: number | null;
}

export interface IRawResult {
    description: {
        extra?: IText[];
    } & IText | string;
    players: Omit<IPlayers, "list">;
    version: Omit<IVersion, "major">;
    favicon?: string;
    modinfo?: IModInfo;
}

export interface IText {
    color?: "black"
        | "dark_blue"
        | "dark_green"
        | "dark_aqua"
        | "dark_red"
        | "dark_purple"
        | "gold"
        | "gray"
        | "dark_gray"
        | "blue"
        | "green"
        | "aqua"
        | "red"
        | "light_purple"
        | "yellow"
        | "white"
        | "reset";
    font?: string;
    bold?: boolean;
    italic?: boolean;
    underlined?: boolean;
    strikethrough?: boolean;
    obfuscated?: boolean;
    text?: string;
    translate?: string;
}

export interface IMotd {
    default: string;
    clear: string;
}

export interface IModInfo {
    type: "FML" | string;
    modList: IMod[];
}

interface IMod {
    modid: string;
    version: string;
}

export interface IPlayers {
    max: number;
    online: number;
    list: string[];
    sample: IPlayer[]
}

interface IPlayer {
    uuid: string;
    name: string;
}

export interface IFavicon {
    icon: string | null;
    data: Buffer | null;
}

export interface IMods {
    names: string[];
    list: unknown[];
}

export interface IVersion {
    protocol: number;
    major: "1.7.9"
        | "1.7.10"
        | "1.8.9"
        | "1.9"
        | "1.9.1"
        | "1.9.4"
        | "1.10.2"
        | "1.11"
        | "1.11.2"
        | "1.12"
        | "1.12.1"
        | "1.12.2"
        | "1.13"
        | "1.13.1"
        | "1.13.2"
        | "1.14"
        | "1.14.1"
        | "1.14.2"
        | "1.14.3"
        | "1.14.4"
        | "1.15"
        | "1.15.1"
        | "1.15.2"
        | "1.16"
        | "1.16.1"
        | "1.16.2"
        | "1.16.3"
        | "1.16.5"
        | "1.17"
        | "1.17.1";
    name: string | "Vanilla";
}

export interface IServerResult {
    motd: IMotd;
    players: IPlayers;
    favicon: IFavicon;
    mods: IMods;
    version: IVersion;
}