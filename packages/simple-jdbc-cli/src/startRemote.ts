import { SimpleJdbcRemoteCli } from "./simpleJdbcRemoteCli";

const cli: SimpleJdbcRemoteCli = new SimpleJdbcRemoteCli();
cli.execute().catch((error) => {
    console.error(error);
    process.exit(1);
});
