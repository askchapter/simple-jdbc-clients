import {
    CommandLineFlagParameter,
    CommandLineParser,
    CommandLineStringParameter,
} from "@rushstack/ts-command-line";
import { SimpleJdbcCliConfiguration } from ".";
import { runCli } from "./runCli";

export class SimpleJdbcCli extends CommandLineParser {
    private _driver!: CommandLineStringParameter;
    private _className!: CommandLineStringParameter;
    private _debug!: CommandLineFlagParameter;
    private _remote!: CommandLineStringParameter;
    private _jdbcUrl!: CommandLineStringParameter;

    public constructor() {
        super({
            toolFilename: "simple-jdbc",
            toolDescription: "Issue queries to a database through a JDBC driver.",
        });
    }

    protected onDefineParameters(): void {
        // Local
        this._driver = this.defineStringParameter({
            parameterLongName: "--driver",
            description: "Path to the JDBC driver file",
            argumentName: "DRIVER",
        });
        this._className = this.defineStringParameter({
            parameterLongName: "--class-name",
            description: "The driver class name to load",
            argumentName: "CLASS_NAME",
        });
        this._debug = this.defineFlagParameter({
            parameterLongName: "--debug",
            description: "Include log output",
        });

        // Remote
        this._remote = this.defineStringParameter({
            parameterLongName: "--remote",
            description:
                "Remote simple-jdbc-server url.  Cannot be used with --driver, --class-name, or --debug",
            argumentName: "REMOTE",
        });

        // Global
        this._jdbcUrl = this.defineStringParameter({
            parameterLongName: "--jdbc-url",
            description: "The JDBC url to use for queries",
            argumentName: "JDBC_URL",
            required: true,
        });
    }

    protected async onExecute(): Promise<void> {
        let configuration: SimpleJdbcCliConfiguration;
        if (this._remote.value !== undefined) {
            configuration = {
                type: "remote",
                remote: this._remote.value!,
            };
        } else {
            const driver = this._driver.value;
            const className = this._className.value;
            const debug = this._debug.value;

            if (driver === undefined || className === undefined) {
                throw new Error("--driver and --classname must be defined");
            }
            configuration = {
                type: "local",
                driver: {
                    path: driver,
                    className,
                },
                debug,
            };
        }
        await runCli({
            configuration,
            jdbcUrl: this._jdbcUrl.value!,
        });
    }
}
