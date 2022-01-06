import * as sidecar from "simple-jdbc-sidecar";
import { IJdbcDriver, SimpleJdbcService, IQuery } from "simple-jdbc-api";
import { DefaultHttpApiBridge } from "conjure-client";
import fetch from "cross-fetch";
import * as readline from "readline";

export interface SimpleJdbcCliOpts {
    driver: IJdbcDriver;
    jdbcUrl: string;
}

export async function runCli(opts: SimpleJdbcCliOpts): Promise<void> {
    const { host, port } = await sidecar.start({
        configuration: {
            drivers: [opts.driver],
        },
        onStdout: (chunk) => console.log(chunk),
        onStderr: (chunk) => console.error(chunk),
        onClose: () => process.exit(1),
    });

    const client = new SimpleJdbcService(
        new DefaultHttpApiBridge({
            baseUrl: `http://${host}:${port}`,
            userAgent: {
                productName: "simple-jdbc-cli",
                // TODO replace with real cli version
                productVersion: "0.0.0",
            },
            fetch,
        })
    );

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.on("close", () => {
        process.exit(0);
    });
    const prompt: (query: string) => Promise<string> = (query: string) =>
        new Promise((resolve) => rl.question(query, resolve));

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const query = await prompt("> ");
        const { rows, columns } = await client.preview({
            jdbcUrl: opts.jdbcUrl,
            query: IQuery.statement({ sql: query }),
            limit: 10,
        });
        console.table(
            rows.map((row) => Object.fromEntries(row.map((value, index) => [columns[index].name, value]))),
            columns.map((column) => column.name)
        );
    }
}

runCli({})
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
