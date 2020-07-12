export class ParseResult {
    constructor(result) {
        this.result = result;
    }

    parse() {
        return {
            motd: this.getMotd(),
            players: this.getPlayers(),
            favicon: this.getFavicon(),
            mods: this.getMods(),
            version: this.getVersion()
        }
    }

    getMotd() {
        const { description } = this.result;

        let motd = {
            default: null,
            clear: null
        };

        if (description.text || description.extra) {
            if (description.text) {
                motd.default = description.text;
            }

            if (description.extra) {
                motd.default = description.extra.map(({text}) => text).join("");
            }
        } else {
            motd.default = description.text === "" ? "" : description;
        }

        motd.clear = motd.default.clearFormatting();

        return motd;
    }

    getMods() {
        const { modinfo } = this.result;

        if (modinfo && modinfo.modList.length > 0) {
            const { modList } = modinfo;

            return {
                names: modList.map(({modid}) => modid),
                list: modList
            }
        }

        return {
            names: [],
            list: []
        }
    }

    getFavicon() {
        const { favicon } = this.result;

        if (favicon) {
            return {
                icon: favicon,
                data: Buffer.from(favicon.replace("data:image/png;base64,", ""), "base64")
            }
        } else {
            return {
                icon: null,
                data: null
            }
        }
    }

    getPlayers() {
        const { players } = this.result;

        const { max, online, sample } = players;

        return {
            max,
            online,
            list: sample ?
                sample
                    .filter(({name}) => name.match(/^[A-Za-z0-9_]{2,16}$/g))
                    .map(item => item.name)
                :
                []
        }
    }

    getVersion() {
        const { version } = this.result;

        const { protocol, name } = version;

        const major = this.getVersionName(protocol);

        return {
            protocol,
            major,
            name: name !== major ? name.clearFormatting() : "Vanilla"
        }
    }

    getVersionName(protocol) {
        if (protocol === 736) return "1.16.1";
        if (protocol >= 701 && protocol <= 735) return "1.16";

        if (protocol >= 576 && protocol <= 578) return "1.15.2";
        if (protocol >= 574 && protocol <= 575) return "1.15.1";
        if (protocol >= 550 && protocol <= 573) return "1.15";

        if (protocol >= 491 && protocol <= 498) return "1.14.4";
        if (protocol >= 486 && protocol <= 490) return "1.14.3";
        if (protocol >= 481 && protocol <= 485) return "1.14.2";
        if (protocol >= 478 && protocol <= 480) return "1.14.1";
        if (protocol >= 441 && protocol <= 477) return "1.14";

        if (protocol >= 402 && protocol <= 404) return "1.13.2";
        if (protocol >= 394 && protocol <= 401) return "1.13.1";
        if (protocol >= 341 && protocol <= 393) return "1.13";

        if (protocol >= 339 && protocol <= 340) return "1.12.2";
        if (protocol >= 336 && protocol <= 338) return "1.12.1";
        if (protocol >= 317 && protocol <= 335) return "1.12";

        if (protocol === 316) return "1.11.x";
        if (protocol >= 301 && protocol <= 315) return "1.11";

        if (protocol >= 201 && protocol <= 210) return "1.10.x";

        if (protocol >= 109 && protocol <= 110) return "1.9.x";
        if (protocol === 108) return "1.9.1";
        if (protocol >= 48 && protocol <= 107) return "1.9";

        if (protocol >= 6 && protocol <= 47) return "1.8.9";

        if (protocol >= 4 && protocol <= 5) return "1.7.10";
        if (protocol >= 0 && protocol <= 3) return "1.7.x";

        return null;
    }
}

String.prototype.clearFormatting = function() {
    return this.replace(/§./g, "");
};
