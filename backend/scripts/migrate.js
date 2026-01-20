const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use environment variable (works in Railway)
const DATABASE_URL = process.env.DATABASE_URL;

async function runSQL(filename) {
  console.log(`\n📄 Running ${filename}...`);
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    
    const sqlPath = path.join(__dirname, '../database', filename);
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    sql = sql.replace(/\\c topup_game/g, '');
    sql = sql.replace(/\\echo.*$/gm, '');
    
    await client.query(sql);
    console.log(`✅ ${filename} complete!`);
    
  } catch (error) {
    console.error(`❌ ${filename} error:`, error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🗄️  Database migration starting...\n');
  
  await runSQL('schema.sql');
  await runSQL('schema_update_multipayment.sql');
  await runSQL('final_products_FINAL.sql');
  
  console.log('\n🎉 Migration complete!');
}

main();