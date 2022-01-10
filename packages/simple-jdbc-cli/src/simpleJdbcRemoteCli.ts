import { CommandLineParser, CommandLineStringParameter } from "@rushstack/ts-command-line";
import { runCli } from "./runCli";

export class SimpleJdbcRemoteCli extends CommandLineParser {
    private _remote!: CommandLineStringParameter;
    private _jdbcUrl!: CommandLineStringParameter;

    public constructor() {
        super({
            toolFilename: "simple-jdbc",
            toolDescription: "Issue queries to a database through a remote simple-jdbc server.",
        });
    }

    protected onDefineParameters(): void {
        this._remote = this.defineStringParameter({
            parameterLongName: "--remote",
            description: "Remote simple-jdbc-server url",
            argumentName: "REMOTE",
            required: true,
        });
        this._jdbcUrl = this.defineStringParameter({
            parameterLongName: "--jdbc-url",
            description: "The JDBC url to use for queries",
            argumentName: "JDBC_URL",
            required: true,
        });
    }

    protected async onExecute(): Promise<void> {
        await runCli({
            configuration: {
                type: "remote",
                remote: this._remote.value!,
            },
            jdbcUrl: this._jdbcUrl.value!,
        });
    }
}
