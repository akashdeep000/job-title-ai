
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const jobTable = sqliteTable('job', {
  id: text('id').primaryKey(),
  uniqueJobTableId: integer('unique_job_table_id').references(() => uniqueJobTable.id),
});

export const uniqueJobTable = sqliteTable('unique_job', {
  id: integer().primaryKey({ autoIncrement: true }),
  jobTitle: text('job_title').unique().notNull(),
  jobFunction: text('job_function'),
  jobSeniority: text('job_seniority'),
  confidence: real('confidence'),
  status: text({ enum: ['pending', 'processing', 'completed'] }).default('pending'),
  // Currenty not needed, but could be used for future features
  // createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  // updatedAt: text('updated_at').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  jobTitlesIdx: index('job_titles_idx').on(table.jobTitle),
  statusIdx: index('status_idx').on(table.status),
  confidenceIdx: index('confidence_idx').on(table.confidence),
}));

