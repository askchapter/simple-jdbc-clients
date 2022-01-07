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
    onExit: () => void;
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

            // Set up sidecar
            const childProcess = spawn(serverStartupScript, [path]);
            childProcess.stdout.on("data", (chunk) => {
                opts.onStdout(chunk.toString());
            });
            childProcess.stderr.on("data", (chunk) => {
                opts.onStderr(chunk.toString());
            });
            childProcess.on("exit", (_code) => {
                remove();
                opts.onExit();
            });

            // Kill the sidecar if the parent dies
            const onParentExit = (): void => {
                remove();
                childProcess.kill();
            };
            process.on("exit", onParentExit);
            process.on("SIGINT", onParentExit);
            process.on("SIGUSR1", onParentExit);
            process.on("SIGUSR2", onParentExit);
            process.on("uncaughtException", onParentExit);

            // TODO: search for open ports (https://github.com/sindresorhus/get-port) or use provided
            resolve({ host: "0.0.0.0", port: 3000 });
        });
    });
}
