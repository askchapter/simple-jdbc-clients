import yargs from "yargs";
import stringArgv from "string-argv";

interface TablesCommandOpts {
    catalog?: string;
    tablePattern?: string;
    schemaPattern?: string;
}

type ParsedTablesCommand =
    | { result: "valid"; arguments: TablesCommandOpts }
    | { result: "invalid"; error: Error }
    | { result: "help"; help: string };

export async function parseTablesCommand(command: string): Promise<ParsedTablesCommand> {
    try {
        const parser = yargs(stringArgv(command).slice(1))
            .scriptName("/tables")
            .option("catalog", { type: "string" })
            .option("schema-pattern", { type: "string" })
            .option("table-pattern", { type: "string" })
            .exitProcess(false)
            .version(false)
            .showHelpOnFail(false)
            .strict(true)
            .showHelp(() => {});
        const options = await parser.argv;

        if (options.help) {
            return { result: "help", help: await parser.getHelp() };
        }
        return {
            result: "valid",
            arguments: {
                catalog: options.catalog,
                schemaPattern: options.schemaPattern,
                tablePattern: options.tablePattern,
            },
        };
    } catch (error) {
        return {
            result: "invalid",
            error: error instanceof Error ? error : new Error("Error parsing table command"),
        };
    }
}
