// backend/scripts/export-digiflazz-enhanced.js
// Enhanced export with RAW output saving (even on failure!)

require('dotenv').config();
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const digiflazzService = require('../src/services/digiflazz.service');

async function exportEnhanced() {
  console.log('📋 Fetching price list from Digiflazz...');
  console.log(`🔧 Mode: ${process.env.DIGIFLAZZ_MODE || 'development'}\n`);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const mode = process.env.DIGIFLAZZ_MODE || 'development';
  
  let result = null;
  let apiError = null;
  
  try {
    // Get price list from Digiflazz
    result = await digiflazzService.getPriceList();
    
    // ALWAYS SAVE RAW RESPONSE (even if failed)
    console.log('💾 Saving raw API response...');
    
    const rawJsonFilename = `digiflazz-raw-${mode}-${timestamp}.json`;
    const rawJsonPath = path.join(__dirname, rawJsonFilename);
    
    // Save complete result object
    await fs.writeFile(
      rawJsonPath, 
      JSON.stringify({
        timestamp: new Date().toISOString(),
        mode: mode,
        result: result,
        environment: {
          DIGIFLAZZ_USERNAME: process.env.DIGIFLAZZ_USERNAME,
          DIGIFLAZZ_MODE: process.env.DIGIFLAZZ_MODE,
          hasDevKey: !!process.env.DIGIFLAZZ_DEVELOPMENT_KEY,
          hasProdKey: !!process.env.DIGIFLAZZ_PRODUCTION_KEY,
        }
      }, null, 2),
      'utf-8'
    );
    
    console.log(`✅ Raw response saved: ${rawJsonFilename}\n`);
    
    // Check if request was successful
    if (!result.success) {
      console.error('❌ API returned error!');
      console.error('Error message:', result.message);
      console.error('Error details:', JSON.stringify(result.error, null, 2));
      
      // Save error details to separate file
      const errorFilename = `digiflazz-error-${mode}-${timestamp}.json`;
      const errorPath = path.join(__dirname, errorFilename);
      
      await fs.writeFile(
        errorPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          mode: mode,
          error: result.error,
          message: result.message,
          fullResult: result,
        }, null, 2),
        'utf-8'
      );
      
      console.log(`\n💾 Error details saved: ${errorFilename}`);
      console.log('\n🔍 Check these files to debug:');
      console.log(`   1. ${rawJsonFilename} - Complete API response`);
      console.log(`   2. ${errorFilename} - Error details\n`);
      
      return; // Exit here if API failed
    }
    
    // Validate data format
    if (!result.data || !Array.isArray(result.data)) {
      console.error('❌ Invalid data format!');
      console.error('Data type:', typeof result.data);
      console.error('Is array?', Array.isArray(result.data));
      
      // Save invalid format for debugging
      const debugFilename = `digiflazz-invalid-${mode}-${timestamp}.json`;
      const debugPath = path.join(__dirname, debugFilename);
      
      await fs.writeFile(
        debugPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          issue: 'Invalid data format',
          dataType: typeof result.data,
          isArray: Array.isArray(result.data),
          result: result,
        }, null, 2),
        'utf-8'
      );
      
      console.log(`\n💾 Debug file saved: ${debugFilename}\n`);
      return;
    }
    
    if (result.data.length === 0) {
      console.error('❌ No products found in response!');
      console.log('💾 Empty response saved to raw JSON file\n');
      return;
    }
    
    console.log(`✅ Got ${result.data.length} products!\n`);
    
    // STEP 2: Analyze products
    console.log('🔍 Analyzing products...\n');
    
    // Search for Valorant
    const valorantProducts = result.data.filter(product => {
      const searchStr = (
        (product.product_name || '') + ' ' + 
        (product.brand || '') + ' ' + 
        (product.category || '') + ' ' +
        (product.buyer_sku_code || '')
      ).toLowerCase();
      
      return searchStr.includes('valorant') || 
             searchStr.includes('valor') ||
             searchStr.includes('val ');
    });
    
    console.log(`🎮 Valorant products found: ${valorantProducts.length}`);
    
    if (valorantProducts.length > 0) {
      console.log('\n📋 Valorant Products:');
      valorantProducts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.product_name} (${p.buyer_sku_code}) - Rp ${p.price.toLocaleString('id-ID')}`);
      });
    } else {
      console.log('⚠️  No Valorant products found in this account!');
      console.log('   Possible reasons:');
      console.log('   - Development account has limited access');
      console.log('   - Need to switch to production mode');
      console.log('   - Valorant might be named differently\n');
    }
    
    // Check other popular games
    const gameTypes = {
      'Mobile Legends': ['mobile legends', 'mobile legend', 'ml '],
      'Free Fire': ['free fire', 'freefire', 'ff '],
      'PUBG': ['pubg'],
      'Genshin Impact': ['genshin'],
      'Call of Duty': ['call of duty', 'cod '],
    };
    
    console.log('\n📊 Other games available:');
    Object.entries(gameTypes).forEach(([gameName, keywords]) => {
      const count = result.data.filter(p => {
        const searchStr = (
          (p.product_name || '') + ' ' + 
          (p.brand || '') + ' ' + 
          (p.category || '')
        ).toLowerCase();
        return keywords.some(kw => searchStr.includes(kw));
      }).length;
      
      console.log(`   ${gameName}: ${count} products`);
    });
    
    // STEP 3: Create Excel
    console.log('\n📊 Creating Excel file...\n');
    
    const workbook = new ExcelJS.Workbook();
    
    // === SHEET 1: All Products ===
    const allSheet = workbook.addWorksheet('All Products');
    
    allSheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'SKU Code', key: 'buyer_sku_code', width: 20 },
      { header: 'Product Name', key: 'product_name', width: 45 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Price (Rp)', key: 'price', width: 15 },
      { header: 'Selling Price (Rp)', key: 'selling_price', width: 18 },
      { header: 'Margin (Rp)', key: 'margin', width: 15 },
      { header: 'Margin %', key: 'margin_percent', width: 12 },
      { header: 'Buyer Status', key: 'buyer_status', width: 12 },
      { header: 'Seller Status', key: 'seller_status', width: 12 },
      { header: 'Stock', key: 'stock', width: 12 },
      { header: 'Description', key: 'desc', width: 50 },
    ];
    
    // Style header
    allSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    allSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    allSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data
    result.data.forEach((product, index) => {
      const margin = (product.selling_price || 0) - (product.price || 0);
      const marginPercent = product.price > 0 
        ? ((margin / product.price) * 100).toFixed(2) 
        : '0.00';
      
      const row = allSheet.addRow({
        no: index + 1,
        buyer_sku_code: product.buyer_sku_code || '',
        product_name: product.product_name || '',
        brand: product.brand || '',
        category: product.category || '',
        type: product.type || '',
        price: product.price || 0,
        selling_price: product.selling_price || 0,
        margin: margin,
        margin_percent: marginPercent + '%',
        buyer_status: product.buyer_product_status ? 'Active' : 'Inactive',
        seller_status: product.seller_product_status ? 'Active' : 'Inactive',
        stock: product.unlimited_stock ? 'Unlimited' : (product.stock || 0),
        desc: Array.isArray(product.desc) ? product.desc.join(', ') : (product.desc || ''),
      });
      
      row.getCell('price').numFmt = '#,##0';
      row.getCell('selling_price').numFmt = '#,##0';
      row.getCell('margin').numFmt = '#,##0';
    });
    
    allSheet.autoFilter = { from: 'A1', to: 'N1' };
    allSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    console.log('✅ All Products sheet created');
    
    // === SHEET 2: Valorant Products ===
    if (valorantProducts.length > 0) {
      const valSheet = workbook.addWorksheet('Valorant');
      valSheet.columns = allSheet.columns;
      
      valSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      valSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF6B6B' }
      };
      valSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      valorantProducts.forEach((product, index) => {
        const margin = (product.selling_price || 0) - (product.price || 0);
        const marginPercent = product.price > 0 
          ? ((margin / product.price) * 100).toFixed(2) 
          : '0.00';
        
        const row = valSheet.addRow({
          no: index + 1,
          buyer_sku_code: product.buyer_sku_code || '',
          product_name: product.product_name || '',
          brand: product.brand || '',
          category: product.category || '',
          type: product.type || '',
          price: product.price || 0,
          selling_price: product.selling_price || 0,
          margin: margin,
          margin_percent: marginPercent + '%',
          buyer_status: product.buyer_product_status ? 'Active' : 'Inactive',
          seller_status: product.seller_product_status ? 'Active' : 'Inactive',
          stock: product.unlimited_stock ? 'Unlimited' : (product.stock || 0),
          desc: Array.isArray(product.desc) ? product.desc.join(', ') : (product.desc || ''),
        });
        
        row.getCell('price').numFmt = '#,##0';
        row.getCell('selling_price').numFmt = '#,##0';
        row.getCell('margin').numFmt = '#,##0';
      });
      
      valSheet.autoFilter = { from: 'A1', to: 'N1' };
      valSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
      
      console.log(`✅ Valorant sheet created (${valorantProducts.length} products)`);
    } else {
      // Add empty sheet with explanation
      const valSheet = workbook.addWorksheet('Valorant');
      valSheet.getCell('A1').value = 'No Valorant products found';
      valSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFF0000' } };
      valSheet.getCell('A3').value = 'Possible reasons:';
      valSheet.getCell('A4').value = '1. Development account has limited access';
      valSheet.getCell('A5').value = '2. Switch to production: DIGIFLAZZ_MODE=production';
      valSheet.getCell('A6').value = '3. Valorant might be named differently';
      
      console.log('⚠️  Valorant sheet created (empty)');
    }
    
    // === SHEET 3: Games ===
    const gamesSheet = workbook.addWorksheet('Games');
    gamesSheet.columns = allSheet.columns;
    
    gamesSheet.getRow(1).font = allSheet.getRow(1).font;
    gamesSheet.getRow(1).fill = allSheet.getRow(1).fill;
    gamesSheet.getRow(1).alignment = allSheet.getRow(1).alignment;
    
    const gameKeywords = ['mobile legends', 'ml ', 'free fire', 'ff ', 'pubg', 
                          'valorant', 'genshin', 'cod', 'game', 'diamond'];
    
    const gameProducts = result.data.filter(product => {
      const searchStr = (
        (product.product_name || '') + ' ' + 
        (product.brand || '') + ' ' + 
        (product.category || '')
      ).toLowerCase();
      return gameKeywords.some(keyword => searchStr.includes(keyword));
    });
    
    gameProducts.forEach((product, index) => {
      const margin = (product.selling_price || 0) - (product.price || 0);
      const marginPercent = product.price > 0 
        ? ((margin / product.price) * 100).toFixed(2) 
        : '0.00';
      
      const row = gamesSheet.addRow({
        no: index + 1,
        buyer_sku_code: product.buyer_sku_code || '',
        product_name: product.product_name || '',
        brand: product.brand || '',
        category: product.category || '',
        type: product.type || '',
        price: product.price || 0,
        selling_price: product.selling_price || 0,
        margin: margin,
        margin_percent: marginPercent + '%',
        buyer_status: product.buyer_product_status ? 'Active' : 'Inactive',
        seller_status: product.seller_product_status ? 'Active' : 'Inactive',
        stock: product.unlimited_stock ? 'Unlimited' : (product.stock || 0),
        desc: Array.isArray(product.desc) ? product.desc.join(', ') : (product.desc || ''),
      });
      
      row.getCell('price').numFmt = '#,##0';
      row.getCell('selling_price').numFmt = '#,##0';
      row.getCell('margin').numFmt = '#,##0';
    });
    
    gamesSheet.autoFilter = { from: 'A1', to: 'N1' };
    gamesSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    console.log(`✅ Games sheet created (${gameProducts.length} products)`);
    
    // === SHEET 4: Summary ===
    const summarySheet = workbook.addWorksheet('Summary');
    
    summarySheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Brand', key: 'brand', width: 25 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Avg Price (Rp)', key: 'avg_price', width: 18 },
      { header: 'Min Price (Rp)', key: 'min_price', width: 18 },
      { header: 'Max Price (Rp)', key: 'max_price', width: 18 },
    ];
    
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    const summary = {};
    result.data.forEach(product => {
      const key = `${product.category || 'Unknown'}|${product.brand || 'Unknown'}`;
      if (!summary[key]) {
        summary[key] = {
          category: product.category || 'Unknown',
          brand: product.brand || 'Unknown',
          count: 0,
          totalPrice: 0,
          prices: [],
        };
      }
      summary[key].count++;
      summary[key].totalPrice += (product.price || 0);
      summary[key].prices.push(product.price || 0);
    });
    
    Object.values(summary)
      .sort((a, b) => b.count - a.count)
      .forEach((item, index) => {
        const row = summarySheet.addRow({
          no: index + 1,
          category: item.category,
          brand: item.brand,
          count: item.count,
          avg_price: item.count > 0 ? Math.round(item.totalPrice / item.count) : 0,
          min_price: Math.min(...item.prices),
          max_price: Math.max(...item.prices),
        });
        
        row.getCell('avg_price').numFmt = '#,##0';
        row.getCell('min_price').numFmt = '#,##0';
        row.getCell('max_price').numFmt = '#,##0';
      });
    
    summarySheet.autoFilter = { from: 'A1', to: 'G1' };
    summarySheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    console.log('✅ Summary sheet created');
    
    // Save Excel
    const excelFilename = `digiflazz-pricelist-${mode}-${timestamp}.xlsx`;
    const excelPath = path.join(__dirname, excelFilename);
    
    await workbook.xlsx.writeFile(excelPath);
    
    console.log(`\n✅ Excel file created: ${excelFilename}`);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`Total products: ${result.data.length}`);
    console.log(`Valorant products: ${valorantProducts.length}`);
    console.log(`Game products: ${gameProducts.length}`);
    console.log(`Categories: ${Object.keys(summary).length}`);
    console.log('\n📁 Files created:');
    console.log(`   1. ${excelFilename} (Excel with 4 sheets)`);
    console.log(`   2. ${rawJsonFilename} (Raw API response)`);
    console.log('\n📍 Location:', __dirname);
    console.log('='.repeat(60));
    
    if (valorantProducts.length === 0) {
      console.log('\n💡 TIP: To get Valorant products:');
      console.log('   1. Change .env: DIGIFLAZZ_MODE=production');
      console.log('   2. Ensure DIGIFLAZZ_PRODUCTION_KEY is set');
      console.log('   3. Run this script again\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('\n🔍 Full error:');
    console.error(error);
    
    // Save error to file
    try {
      const errorFilename = `digiflazz-fatal-error-${mode}-${timestamp}.json`;
      const errorPath = path.join(__dirname, errorFilename);
      
      await fs.writeFile(
        errorPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          mode: mode,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          result: result,
        }, null, 2),
        'utf-8'
      );
      
      console.log(`\n💾 Error saved: ${errorFilename}\n`);
    } catch (saveError) {
      console.error('Failed to save error:', saveError.message);
    }
  }
}

// Run
exportEnhanced().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
