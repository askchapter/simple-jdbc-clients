import {
    CommandLineFlagParameter,
    CommandLineParser,
    CommandLineStringParameter,
} from "@rushstack/ts-command-line";
import { runCli } from "./runCli";

export class SimpleJdbcCli extends CommandLineParser {
    private _driver!: CommandLineStringParameter;
    private _className!: CommandLineStringParameter;
    private _jdbcUrl!: CommandLineStringParameter;
    private _debug!: CommandLineFlagParameter;

    public constructor() {
        super({
            toolFilename: "simple-jdbc",
            toolDescription: "Issue queries to a database through a JDBC driver.",
        });
    }

    protected onDefineParameters(): void {
        this._driver = this.defineStringParameter({
            parameterLongName: "--driver",
            description: "Path to the JDBC driver file",
            argumentName: "DRIVER",
            required: true,
        });
        this._className = this.defineStringParameter({
            parameterLongName: "--class-name",
            description: "The driver class name to load",
            argumentName: "CLASS_NAME",
            required: true,
        });
        this._jdbcUrl = this.defineStringParameter({
            parameterLongName: "--jdbc-url",
            description: "The JDBC url to use for queries",
            argumentName: "JDBC_URL",
            required: true,
        });

        this._debug = this.defineFlagParameter({
            parameterLongName: "--debug",
            description: "Include log output",
        });
    }

    protected onExecute = async (): Promise<void> => {
        await runCli({
            driver: {
                path: this._driver.value!,
                className: this._className.value!,
            },
            jdbcUrl: this._jdbcUrl.value!,
            debug: this._debug.value,
        });
    };
}
