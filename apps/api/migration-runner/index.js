const { Client } = require('pg');
const fs = require('fs');

exports.handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration SQL
    const sql = fs.readFileSync('/var/task/migration.sql', 'utf-8');
    console.log('Executing migration...');

    // Split by statement and execute each one
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
        console.log('Executed: ' + stmt.substring(0, 50) + '...');
      } catch (err) {
        // Skip if object already exists
        if (err.message.includes('already exists')) {
          console.log('Skipped (already exists): ' + stmt.substring(0, 50));
        } else {
          throw err;
        }
      }
    }

    await client.end();
    return { statusCode: 200, body: 'Migration completed successfully' };
  } catch (error) {
    console.error('Migration failed:', error);
    await client.end().catch(() => {});
    return { statusCode: 500, body: 'Migration failed: ' + error.message };
  }
};
