// backend/scripts/export-to-excel.js
// FIXED VERSION - Export Digiflazz price list to Excel

require('dotenv').config();
const ExcelJS = require('exceljs');
const path = require('path');
const digiflazzService = require('../src/services/digiflazz.service');

async function exportToExcel() {
  console.log('📋 Fetching price list from Digiflazz...\n');
  
  try {
    // Get price list from Digiflazz
    const result = await digiflazzService.getPriceList();
    
    console.log('🔍 Debug - Result:', {
      success: result.success,
      hasData: !!result.data,
      dataType: typeof result.data,
      isArray: Array.isArray(result.data),
      dataLength: result.data ? result.data.length : 0,
    });
    
    if (!result.success) {
      console.error('❌ Failed to get price list:', result.message);
      console.error('Error details:', result.error);
      return;
    }
    
    if (!result.data || !Array.isArray(result.data)) {
      console.error('❌ Invalid data format:', result);
      console.error('Expected array, got:', typeof result.data);
      return;
    }
    
    if (result.data.length === 0) {
      console.error('❌ No products found in price list!');
      return;
    }
    
    console.log(`✅ Got ${result.data.length} products!\n`);
    console.log('📊 Creating Excel file...\n');
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: All Products
    const allProductsSheet = workbook.addWorksheet('All Products');
    
    // Define columns
    allProductsSheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'SKU Code', key: 'buyer_sku_code', width: 20 },
      { header: 'Product Name', key: 'product_name', width: 40 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Price (Rp)', key: 'price', width: 15 },
      { header: 'Selling Price (Rp)', key: 'selling_price', width: 18 },
      { header: 'Margin (Rp)', key: 'margin', width: 15 },
      { header: 'Margin %', key: 'margin_percent', width: 12 },
      { header: 'Buyer Status', key: 'buyer_status', width: 12 },
      { header: 'Seller Status', key: 'seller_status', width: 12 },
      { header: 'Seller', key: 'seller_name', width: 20 },
      { header: 'Stock', key: 'stock', width: 12 },
      { header: 'Multi', key: 'multi', width: 10 },
      { header: 'Description', key: 'desc', width: 50 },
    ];
    
    // Style header row
    allProductsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    allProductsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    allProductsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data
    let rowNumber = 1;
    result.data.forEach(product => {
      const margin = (product.selling_price || 0) - (product.price || 0);
      const marginPercent = product.price > 0 
        ? ((margin / product.price) * 100).toFixed(2) 
        : '0.00';
      
      const row = allProductsSheet.addRow({
        no: rowNumber++,
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
        seller_name: product.seller_name || '',
        stock: product.unlimited_stock ? 'Unlimited' : (product.stock || 0),
        multi: product.multi ? 'Yes' : 'No',
        desc: Array.isArray(product.desc) ? product.desc.join(', ') : (product.desc || ''),
      });
      
      // Format price columns
      row.getCell('price').numFmt = '#,##0';
      row.getCell('selling_price').numFmt = '#,##0';
      row.getCell('margin').numFmt = '#,##0';
      
      // Color code by status
      if (!product.buyer_product_status || !product.seller_product_status) {
        row.getCell('buyer_status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
        row.getCell('seller_status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      }
    });
    
    // Add filters
    allProductsSheet.autoFilter = {
      from: 'A1',
      to: 'P1',
    };
    
    // Freeze header row
    allProductsSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];
    
    console.log('✅ All Products sheet created\n');
    
    // Sheet 2: Games Only
    const gamesSheet = workbook.addWorksheet('Games');
    gamesSheet.columns = allProductsSheet.columns;
    
    // Copy header style
    gamesSheet.getRow(1).font = allProductsSheet.getRow(1).font;
    gamesSheet.getRow(1).fill = allProductsSheet.getRow(1).fill;
    gamesSheet.getRow(1).alignment = allProductsSheet.getRow(1).alignment;
    
    // Filter game products
    const gameKeywords = ['mobile legends', 'mobile legend', 'ml ', 'free fire', 'ff ', 
                          'pubg', 'valorant', 'genshin', 'cod', 'call of duty', 
                          'arena of valor', 'aov', 'honor of kings', 'lords mobile', 
                          'ragnarok', 'clash', 'game'];
    
    const gameProducts = result.data.filter(product => {
      const searchStr = (
        (product.product_name || '') + ' ' + 
        (product.brand || '') + ' ' + 
        (product.category || '')
      ).toLowerCase();
      return gameKeywords.some(keyword => searchStr.includes(keyword));
    });
    
    let gameRowNumber = 1;
    gameProducts.forEach(product => {
      const margin = (product.selling_price || 0) - (product.price || 0);
      const marginPercent = product.price > 0 
        ? ((margin / product.price) * 100).toFixed(2) 
        : '0.00';
      
      const row = gamesSheet.addRow({
        no: gameRowNumber++,
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
        seller_name: product.seller_name || '',
        stock: product.unlimited_stock ? 'Unlimited' : (product.stock || 0),
        multi: product.multi ? 'Yes' : 'No',
        desc: Array.isArray(product.desc) ? product.desc.join(', ') : (product.desc || ''),
      });
      
      row.getCell('price').numFmt = '#,##0';
      row.getCell('selling_price').numFmt = '#,##0';
      row.getCell('margin').numFmt = '#,##0';
    });
    
    gamesSheet.autoFilter = { from: 'A1', to: 'P1' };
    gamesSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    console.log(`✅ Games sheet created (${gameProducts.length} products)\n`);
    
    // Sheet 3: Summary by Category and Brand
    const summarySheet = workbook.addWorksheet('Summary');
    
    summarySheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Brand', key: 'brand', width: 25 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Avg Price (Rp)', key: 'avg_price', width: 18 },
      { header: 'Min Price (Rp)', key: 'min_price', width: 18 },
      { header: 'Max Price (Rp)', key: 'max_price', width: 18 },
      { header: 'Avg Margin %', key: 'avg_margin', width: 15 },
    ];
    
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Group by category and brand
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
          margins: [],
        };
      }
      summary[key].count++;
      summary[key].totalPrice += (product.price || 0);
      summary[key].prices.push(product.price || 0);
      
      if (product.price > 0) {
        const margin = ((product.selling_price - product.price) / product.price) * 100;
        summary[key].margins.push(margin);
      }
    });
    
    let summaryRowNumber = 1;
    Object.values(summary)
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .forEach(item => {
        const avgMargin = item.margins.length > 0
          ? (item.margins.reduce((a, b) => a + b, 0) / item.margins.length).toFixed(2)
          : '0.00';
        
        const row = summarySheet.addRow({
          no: summaryRowNumber++,
          category: item.category,
          brand: item.brand,
          count: item.count,
          avg_price: item.count > 0 ? Math.round(item.totalPrice / item.count) : 0,
          min_price: Math.min(...item.prices),
          max_price: Math.max(...item.prices),
          avg_margin: avgMargin + '%',
        });
        
        row.getCell('avg_price').numFmt = '#,##0';
        row.getCell('min_price').numFmt = '#,##0';
        row.getCell('max_price').numFmt = '#,##0';
      });
    
    summarySheet.autoFilter = { from: 'A1', to: 'H1' };
    summarySheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    console.log('✅ Summary sheet created\n');
    
    // Save file - use current directory
    const filename = `digiflazz-pricelist-${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = path.join(__dirname, filename);
    
    await workbook.xlsx.writeFile(filepath);
    
    console.log('✅ Excel file created successfully!\n');
    console.log('📄 File:', filename);
    console.log('📍 Location:', filepath);
    console.log('\n📊 Summary:');
    console.log(`   - Total products: ${result.data.length}`);
    console.log(`   - Game products: ${gameProducts.length}`);
    console.log(`   - Categories: ${Object.keys(summary).length}`);
    console.log('\n✨ Ready for analysis!');
    console.log('\n💡 Open with Excel, Google Sheets, or LibreOffice Calc');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔍 Full error:');
    console.error(error);
  }
}

// Run
exportToExcel().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
