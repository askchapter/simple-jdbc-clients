import { ISimpleJdbcService, SimpleJdbcService } from "simple-jdbc-api";
import { fetch } from "cross-fetch";
import { DefaultHttpApiBridge } from "conjure-client";

export function getSimpleJdbcClient(baseUrl: string): ISimpleJdbcService {
    return new SimpleJdbcService(
        new DefaultHttpApiBridge({
            baseUrl,
            userAgent: {
                productName: "simple-jdbc-client-factory",
                productVersion: "0.0.0",
            },
            fetch,
        })
    );
}
