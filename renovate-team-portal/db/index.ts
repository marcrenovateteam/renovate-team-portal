import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import {database} from '@/lib/database.mjs';
export function getDb(){return drizzle(database(),{schema});}
