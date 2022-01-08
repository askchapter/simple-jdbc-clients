import { SimpleJdbcCli } from "./simpleJdbcCli";

const cli: SimpleJdbcCli = new SimpleJdbcCli();
cli.execute().catch((error) => {
    console.error(error);
    process.exit(1);
});
