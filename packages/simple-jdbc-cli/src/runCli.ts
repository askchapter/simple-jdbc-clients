import * as sidecar from "simple-jdbc-sidecar";
import { IJdbcDriver, SimpleJdbcService, IQuery } from "simple-jdbc-api";
import { DefaultHttpApiBridge } from "conjure-client";
import fetch from "cross-fetch";
import repl from "repl";

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
        onExit: () => process.exit(1),
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

    repl.start({
        prompt: "> ",
        eval: async (query, _context, _filename, callback) => {
            try {
                const { rows, columns } = await client.preview({
                    jdbcUrl: opts.jdbcUrl,
                    query: IQuery.statement({ sql: query }),
                    limit: 10,
                });
                console.table(
                    rows.map((row) =>
                        Object.fromEntries(row.map((value, index) => [columns[index].name, value]))
                    ),
                    columns.map((column) => column.name)
                );
                callback(null, "Query executed successfully");
            } catch (error) {
                callback(error as Error, "Error executing query");
            }
        },
    });
}
