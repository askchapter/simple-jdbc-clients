import { CommandLineParser, CommandLineStringParameter } from "@rushstack/ts-command-line";

export interface TablesCommandOpts {
    catalog?: string;
    schemaPattern?: string;
    tablePattern?: string;
}

export class TablesCommandParser extends CommandLineParser {
    private _catalog!: CommandLineStringParameter;
    private _schemaPattern!: CommandLineStringParameter;
    private _tablePattern!: CommandLineStringParameter;

    public constructor() {
        super({
            toolFilename: "/tables",
            toolDescription: "search tables in the database",
        });
    }

    protected onDefineParameters(): void {
        this._catalog = this.defineStringParameter({
            parameterLongName: "--catalog",
            description: "The catalog to limit results to",
            argumentName: "CATALOG",
            required: false,
        });
        this._schemaPattern = this.defineStringParameter({
            parameterLongName: "--schema-pattern",
            description: "The schema pattern (using standard LIKE syntax) to use in limiting results",
            argumentName: "SCHEMA_PATTERN",
            required: false,
        });
        this._tablePattern = this.defineStringParameter({
            parameterLongName: "--table-pattern",
            description: "The table pattern (using standard LIKE syntax) to use in limiting results",
            argumentName: "TABLE_PATTERN",
            required: false,
        });
    }

    public getOpts(): TablesCommandOpts {
        return {
            catalog: this._catalog.value,
            schemaPattern: this._schemaPattern.value,
            tablePattern: this._tablePattern.value,
        };
    }
}
