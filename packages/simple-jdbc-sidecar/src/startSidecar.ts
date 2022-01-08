import { IConfiguration, IJdbcDriver, SimpleJdbcService, ISimpleJdbcService } from "simple-jdbc-api";
import { DefaultHttpApiBridge } from "conjure-client";
import fetch from "cross-fetch";
import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import * as tmp from "tmp";
import { getPortPromise } from "portfinder";
import { spawn } from "child_process";
import { SERVER_VERSION } from "./serverVersion";
import { sleep } from "./sleep";

export interface SimpleJdbcSidecarOpts {
    drivers: IJdbcDriver[];
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    onExit: () => void;
}

export async function startSidecar(opts: SimpleJdbcSidecarOpts): Promise<ISimpleJdbcService> {
    const serverStartupScript = `${__dirname}/bin/simple-jdbc-server-${SERVER_VERSION}/bin/simple-jdbc-server`;

    return new Promise((resolve, reject) => {
        tmp.file(async (error, path, _fd, remove) => {
            if (error) reject(error);

            try {
                const host = "0.0.0.0";
                const port = await getPortPromise({ port: 8000 });
                const configuration: IConfiguration = {
                    host,
                    port,
                    drivers: opts.drivers,
                };
                await fs.writeFile(path, yaml.dump(configuration));

                // Set up sidecar
                const childProcess = spawn(serverStartupScript, [path]);
                childProcess.stdout.on("data", (chunk) => {
                    if (opts.onStdout) {
                        opts.onStdout(chunk.toString());
                    }
                });
                childProcess.stderr.on("data", (chunk) => {
                    if (opts.onStderr) {
                        opts.onStderr(chunk.toString());
                    }
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

                // Construct a client to pass back to the consumer
                const client = new SimpleJdbcService(
                    new DefaultHttpApiBridge({
                        baseUrl: `http://${host}:${port}`,
                        userAgent: {
                            productName: "simple-jdbc-sidecar",
                            // TODO replace with real sidecar version
                            productVersion: "0.0.0",
                        },
                        fetch,
                    })
                );

                // Wait for the server to become ready
                for (let i = 1; i <= 10; i++) {
                    try {
                        const ready = await client.ready();
                        if (ready) {
                            resolve(client);
                            return;
                        }
                        // eslint-disable-next-line no-empty
                    } catch (error) {
                        if (i === 10) {
                            reject(error);
                        }
                        await sleep(1000);
                    }
                }
            } catch (error) {
                remove();
                reject(error);
            }
        });
    });
}
