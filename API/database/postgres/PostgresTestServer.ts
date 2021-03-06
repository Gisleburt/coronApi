import {StartedTestContainer} from 'testcontainers/dist/test-container';
import {GenericContainer} from 'testcontainers';
import * as path from "path";
import {Pool} from 'pg';
import {PostgresDatabase} from "./PostgresDatabase";
import {getCoronaConnectionDetails} from "../../config/test";
import {PostgresMigrator} from "./PostgresMigrator";

export class PostgresTestServer {
  private postgres?: StartedTestContainer;

  public async start() {
    this.postgres = await new GenericContainer('postgres', '9.6-alpine')
      .withExposedPorts(5432)
      .start();
    const mappedPort = this.postgres.getMappedPort(5432);
    return {
      host: 'localhost',
      port: mappedPort,
      user: 'postgres',
      password: '',
      database: 'postgres'
    };
  }

  public async startAndGetCoronapiDatabase(): Promise<PostgresDatabase> {
    const adminConnectionDetails = await this.start();
    await new PostgresMigrator(adminConnectionDetails, path.resolve('./database/bootstrap')).migrate();

    const coronapiConnectionDetails = getCoronaConnectionDetails(adminConnectionDetails.port);

    await new PostgresMigrator(coronapiConnectionDetails, path.resolve('./database/migrations')).migrate();
    return new PostgresDatabase(new Pool(coronapiConnectionDetails));
  }

  public async stop() {
    await this.postgres!.stop();
  }

}
