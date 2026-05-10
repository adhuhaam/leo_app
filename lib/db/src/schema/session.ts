import { pgTable, varchar, json, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Session storage table used by `connect-pg-simple`. The runtime owner is
 * `artifacts/api-server/src/lib/session.ts` (`ensureSessionTable`), but we
 * declare it here so `drizzle-kit push` doesn't propose to drop it on every
 * merge. Shape mirrors the bootstrap SQL exactly.
 */
export const sessionTable = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey().notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (t) => ({
    expireIdx: index("IDX_session_expire").on(t.expire),
  }),
);
