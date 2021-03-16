import { IFavicon, IMods, IMotd, IPlayers, IRawResult, IResult, IText, IVersion } from "./interfaces";

const colors = new Map<IText["color"], string>([
    ["black", "0"],
    ["dark_blue", "1"],
    ["dark_green", "2"],
    ["dark_aqua", "3"],
    ["dark_red", "4"],
    ["dark_purple", "5"],
    ["gold", "6"],
    ["gray", "7"],
    ["dark_gray", "8"],
    ["blue", "9"],
    ["green", "a"],
    ["aqua", "b"],
    ["red", "c"],
    ["light_purple", "d"],
    ["yellow", "e"],
    ["white", "f"],
    ["reset", "r"]
]);

// https://wiki.vg/Protocol_version_numbers
const versions = new Map<IVersion["major"], [number] | [number, number]>([
    ["1.17", [755]],
    ["1.16.5", [754]], // 1.16.4 - 1.16.5 = 754
    ["1.16.3", [752, 753]],
    ["1.16.2", [738, 751]],
    ["1.16.1", [736]],
    ["1.16", [701, 735]],

    ["1.15.2", [576, 578]],
    ["1.15.1", [574, 575]],
    ["1.15", [550, 573]],

    ["1.14.4", [491, 498]],
    ["1.14.3", [486, 490]],
    ["1.14.2", [481, 485]],
    ["1.14.1", [478, 480]],
    ["1.14", [441, 477]],

    ["1.13.2", [402, 404]],
    ["1.13.1", [394, 401]],
    ["1.13", [341, 393]],

    ["1.12.2", [339, 340]],
    ["1.12.1", [336, 338]],
    ["1.12", [317, 335]],

    ["1.11.2", [316]],
    ["1.11", [301, 315]],

    ["1.10.2", [201, 210]],

    ["1.9.4", [109, 110]],
    ["1.9.1", [108]],
    ["1.9", [48, 107]],
    ["1.8.9", [6, 47]],

    ["1.7.10", [4, 5]],
    ["1.7.9", [0, 3]]
]);

export class Result {

    result: IRawResult;

    constructor(result: IRawResult) {
        this.result = result;
    }

    parse(): IResult {
        return {
            motd: this.getMotd(),
            players: this.getPlayers(),
            favicon: this.getFavicon(),
            mods: this.getMods(),
            version: this.getVersion(),
            ping: null
        };
    }

    private getMotd(): IMotd {
        const { description } = this.result;

        const motd = {
            default: "",
            clear: ""
        };

        if (typeof description === "object") {
            motd.default = description?.text ?? description?.translate ?? "";

            if (description?.extra) {
                motd.default = this.parseExtra(description.extra);
            }
        } else {
            motd.default = description;
        }

        motd.clear = clearFormatting(motd.default);

        return motd;
    }

    private getMods(): IMods {
        const { modinfo } = this.result;

        if (modinfo?.modList && modinfo?.modList?.length > 0) {
            const { modList } = modinfo;

            return {
                names: modList.map(({ modid }) => modid),
                list: modList
            };
        }

        return {
            names: [],
            list: []
        };
    }

    private getFavicon(): IFavicon {
        return {
            icon: this.result?.favicon || null,
            data: this.result?.favicon ?
                Buffer.from(this.result.favicon.replace("data:image/png;base64,", ""), "base64")
                :
                null
        };
    }

    private getPlayers(): IPlayers {
        const { players: { max, online, sample } } = this.result;

        return {
            max,
            online,
            list: sample ?
                sample
                    .filter(({ name }) => name.match(/^[A-Za-z0-9_]{1,16}$/g))
                    .map(({ name }) => name)
                :
                [],
            sample: sample ?? []
        };
    }

    private getVersion(): IVersion {
        const { version } = this.result;

        const { protocol, name } = version;

        const major = this.getMajorVersion(protocol);

        return {
            protocol,
            major,
            name: name !== major ? clearFormatting(name) : "Vanilla"
        };
    }

    private parseExtra(extra: IText[]): string {
        return extra.map(({ color, bold, italic, underlined, strikethrough, obfuscated, text }) => {
            if (bold) {
                text = `§l${text}`;
            }

            if (italic) {
                text = `§o${text}`;
            }

            if (underlined) {
                text = `§n${text}`;
            }

            if (strikethrough) {
                text = `§m${text}`;
            }

            if (obfuscated) {
                text = `§k${text}`;
            }

            if (color) {
                text = `${colors.has(color) ? `§${colors.get(color)}` : ""}${text}`;
            }

            return text;
        })
            .join("");
    }

    private getMajorVersion(protocol: number): IVersion["major"] {
        return [...versions.entries()]
            .filter(([, protocols]) => {
                if (protocols.length === 2) {
                    const [protocol1, protocol2] = protocols;

                    return protocol >= protocol1 && protocol <= protocol2;
                } else {
                    const [protocol1] = protocols;

                    return protocol === protocol1;
                }
            })
            .map(([major]) => major)
            .join("") as IVersion["major"];
    }
}

function clearFormatting(string: string): string {
    return string.replace(/§./g, "");
}
