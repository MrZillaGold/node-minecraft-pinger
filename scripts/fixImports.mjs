import { promises as fs } from "fs";

const BUILD_DIR = "./dist";

fs.readdir(BUILD_DIR)
    .then((files) => {
        files.forEach(async (file) => {
            console.log(file)
            if (file.endsWith(".js") && file !== "Result.js") {
                const filePath = `${BUILD_DIR}/${file}`;

                fs.readFile(filePath)
                    .then((file) => {
                        file = file.toString();

                        file = file.replace(/\.default/gm, "")
                            .replace(/\.mjs/gm, ".js");

                        fs.writeFile(filePath, file);
                    });
            }
        })
    });
