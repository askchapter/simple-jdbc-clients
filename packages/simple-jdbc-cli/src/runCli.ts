import { startSidecar } from "simple-jdbc-sidecar";
import { IJdbcDriver, IQuery } from "simple-jdbc-api";
import chalk from "chalk";
import repl from "repl";
import Table from "cli-table";

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

    repl.start({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eval: async (command, _context, _filename, callback: (err: Error | null, result?: any) => void) => {
            try {
                const query = command.trim();
                if (query === "") {
                    // Do nothing
                } else if (query === "/help") {
                    // Print help message
                } else if (query === "/catalogs") {
                    const catalogs = await client.catalogs({ jdbcUrl });
                    const table = new Table({ head: ["catalog"] });
                    catalogs.forEach((catalog) => table.push([catalog]));
                    console.log(table.toString());
                } else if (query.startsWith("/tables")) {
                    // Search tables with remainder
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
