import * as https from "https";
import * as fs from "fs";
import * as tar from "tar";
import { SERVER_VERSION } from "./serverVersion";

async function download(url: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        https
            .get(url, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            })
            .on("error", (error) => {
                fs.rmSync(path);
                reject(error.message);
            });
    });
}

export async function downloadServer(): Promise<void> {
    const binDir = "./lib/bin";
    const downloadUrl = `https://repo1.maven.org/maven2/org/askchapter/simplejdbc/simple-jdbc-server/${SERVER_VERSION}/simple-jdbc-server-${SERVER_VERSION}.tar`;
    const downloadPath = `${binDir}/simple-jdbc-server-${SERVER_VERSION}.tar`;
    const expectedPath = `${binDir}/simple-jdbc-server-${SERVER_VERSION}`;
    if (fs.existsSync(expectedPath)) {
        return;
    }

    try {
        fs.mkdirSync(binDir);
        await download(downloadUrl, downloadPath);
        await tar.x({ file: downloadPath, cwd: binDir });
        fs.rmSync(downloadPath);
    } catch (error) {
        throw new Error("Failed downloading server distribution");
    }
}

downloadServer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
