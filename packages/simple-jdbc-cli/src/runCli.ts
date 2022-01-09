import { startSidecar } from "simple-jdbc-sidecar";
import { IJdbcDriver, IQuery, IMetadataResponse } from "simple-jdbc-api";
import chalk from "chalk";
import dedent from "dedent";
import repl from "repl";
import Table from "cli-table";
import stringArgv from "string-argv";
import { TablesCommandParser } from "./tablesCommandParser";

export interface SimpleJdbcCliOpts {
    driver: IJdbcDriver;
    jdbcUrl: string;
    debug: boolean;
}

export async function runCli(opts: SimpleJdbcCliOpts): Promise<void> {
    const { jdbcUrl, driver, debug } = opts;

    const debugLoggers = debug
        ? {
              onStdout: (chunk: string) => console.log(chunk),
              onStderr: (chunk: string) => console.error(chalk.red(chunk)),
          }
        : {};

    const client = await startSidecar({
        drivers: [driver],
        ...debugLoggers,
        onExit: () => process.exit(1),
    });

    const metadata = await client.metadata({ jdbcUrl });
    console.log(helpMessage(metadata));

    repl.start({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eval: async (command, _context, _filename, callback: (err: Error | null, result?: any) => void) => {
            try {
                const query = command.trim();
                if (query === "") {
                    // Do nothing
                } else if (query === "/help") {
                    const metadata = await client.metadata({ jdbcUrl });
                    console.log(helpMessage(metadata));
                } else if (query === "/catalogs") {
                    const catalogs = await client.catalogs({ jdbcUrl });
                    const table = new Table({ head: ["catalog"] });
                    catalogs.forEach((catalog) => table.push([catalog]));
                    console.log(table.toString());
                } else if (query.startsWith("/tables")) {
                    const args = stringArgv(query).slice(1);
                    const tablesCommandParser = new TablesCommandParser();
                    await tablesCommandParser.execute(args);
                    if (tablesCommandParser.parametersProcessed) {
                        const tables = await client.tables({
                            jdbcUrl,
                            ...tablesCommandParser.getOpts(),
                        });
                        const displayTable = new Table({
                            head: ["catalog", "schema", "table", "type"],
                        });
                        tables.forEach((table) =>
                            displayTable.push([
                                table.locator.catalog,
                                table.locator.schema,
                                table.locator.table,
                                table.type,
                            ])
                        );
                        console.log(displayTable.toString());
                    }
                } else {
                    const { rows, columns } = await client.preview({
                        jdbcUrl,
                        query: IQuery.statement({ sql: query }),
                    });
                    const table = new Table({
                        head: columns.map((column) => `${column.name} (${column.type.type})`),
                    });
                    rows.forEach((row) => table.push(row));
                    console.log(table.toString());
                }

                callback(null);
            } catch (error) {
                console.error(chalk.red("Error executing query"));
                callback(error as Error);
            }
        },
    });
}

function helpMessage(metadata: IMetadataResponse): string {
    return dedent`
    ==================================================================
    simple-jdbc - ${metadata.productName} (${metadata.productVersion})

    usage:
    - type '/help' to display this message again
    - type '/catalogs' to list catalogs in the database
    - type '/tables' to search tables in the database
    - enter a SQL query to run it and display a preview of the results
    ==================================================================
    `;
}
