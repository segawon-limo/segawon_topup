const { Client } = require('pg');
const fs = require('fs');

// Use the PUBLIC connection string (with proxy.rlwy.net)
const DATABASE_URL = 'postgresql://postgres:QOMjVuspUQvhtXrWWnTZRsdmgvvxuXfl@caboose.proxy.rlwy.net:38884/railway';

async function runSQL(filename) {
  console.log(`\n📄 Running ${filename}...`);
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Railway
    }
  });
  
  try {
    await client.connect();
    
    // Read SQL file
    let sql = fs.readFileSync(filename, 'utf8');
    
    // Remove PostgreSQL-specific commands
    sql = sql.replace(/\\c topup_game/g, '');
    sql = sql.replace(/\\echo.*$/gm, '');
    
    // Execute
    await client.query(sql);
    
    console.log(`✅ ${filename} executed successfully!`);
    
  } catch (error) {
    console.error(`❌ Error in ${filename}:`);
    console.error(error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🗄️  Starting database migration...\n');
  
  try {
    // Test connection
    const testClient = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await testClient.connect();
    console.log('✅ Database connected!\n');
    await testClient.end();
    
    // Run migrations
    await runSQL('schema.sql');
    await runSQL('schema_update_multipayment.sql');
    await runSQL('final_products_FINAL.sql');
    
    // Verify
    const verifyClient = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await verifyClient.connect();
    
    const gamesResult = await verifyClient.query('SELECT COUNT(*) FROM games');
    const productsResult = await verifyClient.query('SELECT COUNT(*) FROM products');
    
    console.log('\n🎉 Database initialized successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Games: ${gamesResult.rows[0].count}`);
    console.log(`   Products: ${productsResult.rows[0].count}`);
    
    await verifyClient.end();
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  }
}

main();