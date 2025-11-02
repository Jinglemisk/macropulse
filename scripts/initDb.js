#!/usr/bin/env node

/**
 * Initialize database
 * This script ensures the database file and all tables are created
 */

console.log('Initializing database...\n');

// Just require the database module - it will create tables automatically
require('../backend/database');

console.log('✓ Database initialized successfully');
console.log('✓ All tables created');
console.log('\nNext steps:');
console.log('1. Copy .env.example to .env and add your API keys');
console.log('2. Run: npm run fetch-macro');
console.log('3. Run: npm run dev\n');
