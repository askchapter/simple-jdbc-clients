import { startSidecar } from "simple-jdbc-sidecar";
import { IJdbcDriver, IQuery, IMetadataResponse, ISimpleJdbcService } from "simple-jdbc-api";
import { getSimpleJdbcClient } from "simple-jdbc-client-factory";
import chalk from "chalk";
import dedent from "dedent";
import repl from "repl";
import Table from "cli-table";
import { parseTablesCommand } from "./parseTablesCommand";

interface SimpleJdbcCliLocalConfiguration {
    type: "local";
    driver: IJdbcDriver;
    debug: boolean;
}

interface SimpleJdbcCliRemoteConfiguration {
    type: "remote";
    remote: string;
}

export type SimpleJdbcCliConfiguration = SimpleJdbcCliLocalConfiguration | SimpleJdbcCliRemoteConfiguration;

export interface SimpleJdbcCliOpts {
    configuration: SimpleJdbcCliConfiguration;
    jdbcUrl: string;
}

export async function runCli(opts: SimpleJdbcCliOpts): Promise<void> {
    const { jdbcUrl, configuration } = opts;

    const client =
        configuration.type === "local"
            ? await getLocalClient(configuration)
            : getSimpleJdbcClient(configuration.remote);

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

async function getLocalClient(
    localConfiguration: SimpleJdbcCliLocalConfiguration
): Promise<ISimpleJdbcService> {
    const debugLoggers = localConfiguration.debug
        ? {
              onStdout: (chunk: string) => console.log(chunk),
              onStderr: (chunk: string) => console.error(chalk.red(chunk)),
          }
        : {};
    return await startSidecar({
        drivers: [localConfiguration.driver],
        ...debugLoggers,
        onExit: () => process.exit(1),
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
