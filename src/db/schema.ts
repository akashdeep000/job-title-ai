
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const jobTitles = sqliteTable('job_titles', {
  id: text('id').primaryKey(),
  jobTitle: text('job_title').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  retryCount: integer('retry_count').default(0),
  jobFunction: text('job_function'),
  jobSeniority: text('job_seniority'),
  confidence: real('confidence'),
  standardizedJobTitle: text('standardized_job_title'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
}));
