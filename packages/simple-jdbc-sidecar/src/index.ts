import type { IConfiguration } from "simple-jdbc-api";
import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import * as tmp from "tmp";
import { spawn } from "child_process";
import { SERVER_VERSION } from "./serverVersion";

interface SimpleJdbcSidecarOpts {
    configuration: IConfiguration;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStdout: (data: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStderr: (data: string) => void;
    onClose: () => void;
}

interface SimpleJdbcSidecarProcess {
    host: string;
    port: number;
}

export async function start(opts: SimpleJdbcSidecarOpts): Promise<SimpleJdbcSidecarProcess> {
    const serverStartupScript = `${__dirname}/bin/simple-jdbc-server-${SERVER_VERSION}/bin/simple-jdbc-server`;

    return new Promise((resolve, reject) => {
        tmp.file(async (error, path, _fd, remove) => {
            if (error) reject(error);

            await fs.writeFile(path, yaml.dump(opts.configuration));

            const process = spawn(serverStartupScript, [path]);
            process.stdout.on("data", (chunk) => {
                opts.onStdout(chunk.toString());
            });
            process.stderr.on("data", (chunk) => {
                opts.onStderr(chunk.toString());
            });
            process.on("close", (_code) => {
                remove();
                opts.onClose();
            });

            // TODO: search for open ports (https://github.com/sindresorhus/get-port) or use provided
            resolve({ host: "0.0.0.0", port: 3000 });
        });
    });
}
