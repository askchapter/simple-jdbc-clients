import { startSidecar } from "simple-jdbc-sidecar";
import { IJdbcDriver, IQuery, IMetadataResponse } from "simple-jdbc-api";
import chalk from "chalk";
import dedent from "dedent";
import repl from "repl";
import Table from "cli-table";
import { parseTablesCommand } from "./parseTablesCommand";

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
                    printTable(
                        ["catalog"],
                        catalogs.map((catalog) => [catalog])
                    );
                } else if (query.startsWith("/tables")) {
                    const parsedCommand = await parseTablesCommand(query);
                    if (parsedCommand.result === "help") {
                        console.log(parsedCommand.help);
                    } else if (parsedCommand.result === "invalid") {
                        throw parsedCommand.error;
                    } else {
                        const tables = await client.tables({
                            jdbcUrl,
                            ...parsedCommand.arguments,
                        });
                        printTable(
                            ["catalog", "schema", "table", "type"],
                            tables.map((table) => [
                                table.locator.catalog,
                                table.locator.schema,
                                table.locator.table,
                                table.type,
                            ])
                        );
                    }
                } else {
                    const { columns, rows } = await client.preview({
                        jdbcUrl,
                        query: IQuery.statement({ sql: query }),
                    });
                    printTable(
                        columns.map((column) => `${column.name} (${column.type.type})`),
                        rows
                    );
                }

                callback(null);
            } catch (error) {
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
    - type '/tables' to search tables in the database, and
      '/tables --help' to see available options
    - enter a SQL query to run it and display a preview of the results
    ==================================================================
    `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function printTable(columns: string[], rows: any[][]): void {
    const table = new Table({ head: columns });
    rows.forEach((row) => table.push(row.map((value) => value ?? "")));
    console.log(table.toString());
}
