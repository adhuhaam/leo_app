import "../../lib/env/load-env.ts";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.local.example to .env first.");
  process.exit(1);
}

const maxAttempts = 30;

async function waitForDb(): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 2000 });
    try {
      await pool.query("select 1");
      await pool.end();
      console.log("Database is ready.");
      return;
    } catch (err) {
      await pool.end().catch(() => {});
      if (attempt === maxAttempts) {
        console.error(
          "Could not connect to Postgres after 30 attempts.\n" +
            "  • Start Docker: pnpm dev:db\n" +
            "  • Or set DATABASE_URL to your Supabase connection string in .env",
        );
        throw err;
      }
      console.log(`Waiting for database… (${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

waitForDb().catch(() => process.exit(1));
