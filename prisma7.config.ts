import 'dotenv/config';
import { defineConfig, env } from '@prisma/prisma7/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
