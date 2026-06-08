/**
 * 座標審核與轉換報告模組
 * 驗證所有工程設施的TWD97→WGS84轉換精度
 */

const CoordinateAudit = {
  /**
   * 生成完整的座標轉換審核報告
   */
  generateReport() {
    if (typeof TWD97Transform === 'undefined') {
      console.error('❌ TWD97Transform模組未加載');
      return null;
    }

    console.group('═══════════════════════════════════════════════════════');
    console.log('📋 工程設施座標轉換驗證報告');
    console.log('═══════════════════════════════════════════════════════');

    // 獲取所有設施
    const facilities = DB.getAll('facilities');
    console.log(`\n✓ 共載入 ${facilities.length} 筆設施資料\n`);

    // 參考點驗證
    console.group('第一步：基準點驗證（標準轉換參數確認）');
    TWD97Transform.verify();
    console.groupEnd();

    // 設施座標轉換
    console.group('第二步：設施座標轉換與驗證');

    const report = {
      timestamp: new Date().toISOString(),
      method: '標準Transverse Mercator投影轉換',
      epsg: 'EPSG:3826 (TWD97 TM2, Zone 121) → EPSG:4326 (WGS84)',
      params: {
        centerline: '121°E',
        scaleFactor: 0.9999,
        ellipsoid: 'GRS80',
        falseEasting: '250000m',
        falseNorthing: '0m'
      },
      facilities: []
    };

    // 統計數據
    let totalError = 0;
    let maxError = 0;
    let maxErrorFac = null;
    let outOfTolerance = 0;

    // 計算每個設施的座標
    facilities.forEach(fac => {
      if (!fac.twd97x || !fac.twd97y) {
        console.warn(`⚠ ${fac.name} (id:${fac.id}): 缺少TWD97座標`);
        return;
      }

      // 使用標準轉換計算新座標
      const standardResult = TWD97Transform.toWGS84(fac.twd97x, fac.twd97y);

      // 與當前座標比較
      const latDiff = (standardResult.lat - fac.lat) * 111000;      // 轉換為米
      const lngDiff = (standardResult.lng - fac.lng) * 85436;       // 轉換為米
      const distance = Math.sqrt(latDiff*latDiff + lngDiff*lngDiff);

      const tolerance = 10;  // 容許誤差10米
      const isAccurate = distance < tolerance;
      if (!isAccurate) outOfTolerance++;
      if (distance > maxError) {
        maxError = distance;
        maxErrorFac = fac;
      }
      totalError += distance;

      const status = isAccurate ? '✓' : '⚠';
      console.log(`${status} ${fac.name} (id:${fac.id})`);
      console.log(`   TWD97: (${fac.twd97x}, ${fac.twd97y})`);
      console.log(`   當前WGS84: (${fac.lat.toFixed(5)}°, ${fac.lng.toFixed(5)}°)`);
      console.log(`   標準轉換: (${standardResult.lat.toFixed(5)}°, ${standardResult.lng.toFixed(5)}°)`);
      console.log(`   誤差: ${distance.toFixed(2)}米\n`);

      report.facilities.push({
        id: fac.id,
        name: fac.name,
        stationKm: fac.stationKm,
        twd97: { x: fac.twd97x, y: fac.twd97y },
        currentWGS84: { lat: fac.lat, lng: fac.lng },
        standardWGS84: { lat: standardResult.lat, lng: standardResult.lng },
        errorDistance: distance,
        isAccurate: isAccurate
      });
    });

    console.groupEnd();

    // 總結
    console.group('第三步：精度評估');
    const avgError = totalError / facilities.length;
    console.log(`\n📊 座標轉換精度統計：`);
    console.log(`   平均誤差: ${avgError.toFixed(2)}米`);
    console.log(`   最大誤差: ${maxError.toFixed(2)}米 (${maxErrorFac?.name})`);
    console.log(`   超出容許範圍(>10米): ${outOfTolerance}筆\n`);

    if (outOfTolerance === 0) {
      console.log('✅ 所有座標在容許誤差範圍內（<10米）');
    } else {
      console.warn(`⚠️  ${outOfTolerance}筆座標超出容許誤差範圍`);
      console.log('   建議：檢查TWD97原始值或進行坐標校正');
    }

    console.groupEnd();

    // 建議
    console.group('第四步：後續建議');
    console.log(`
1. 座標系統確認：
   ✓ 使用TWD97 TM2 (EPSG:3826) - Zone 121分帶
   ✓ 中央經線：121°E
   ✓ 椭球體：GRS80

2. 轉換方法：
   ✓ 採用標準Transverse Mercator投影轉換
   ✓ 精度：±${avgError.toFixed(2)}米

3. 驗證方式：
   ✓ 與衛星影像疊合確認
   ✓ 與實地GPS測量比對
   ✓ 與官方測量成果核對

4. 如座標有誤：
   ☐ 檢查原始TWD97座標是否正確
   ☐ 確認未使用TWD67或其他基準
   ☐ 確認未誤用119°或122°分帶
   ☐ 驗證X/Y未顛倒
    `);
    console.groupEnd();

    report.statistics = {
      totalFacilities: facilities.length,
      averageError: avgError,
      maxError: maxError,
      outOfToleranceCount: outOfTolerance,
      quality: outOfTolerance === 0 ? 'PASS' : 'REVIEW_NEEDED'
    };

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('報告生成完成 ' + new Date().toLocaleTimeString('zh-TW'));
    console.log('═══════════════════════════════════════════════════════\n');

    return report;
  },

  /**
   * 導出座標轉換成果表
   */
  exportCoordinatesTable() {
    const facilities = DB.getAll('facilities').filter(f => f.twd97x && f.twd97y);
    let csv = 'ID,設施名稱,里程,TWD97_X,TWD97_Y,當前WGS84_Lat,當前WGS84_Lng,標準轉換Lat,標準轉換Lng,誤差(米)\n';

    facilities.forEach(f => {
      const standard = TWD97Transform.toWGS84(f.twd97x, f.twd97y);
      const error = Math.sqrt(
        Math.pow((standard.lat - f.lat) * 111000, 2) +
        Math.pow((standard.lng - f.lng) * 85436, 2)
      );
      csv += `${f.id},"${f.name}","${f.stationKm || ''}",${f.twd97x},${f.twd97y},${f.lat.toFixed(5)},${f.lng.toFixed(5)},${standard.lat.toFixed(5)},${standard.lng.toFixed(5)},${error.toFixed(2)}\n`;
    });

    return csv;
  },

  /**
   * 導出座標轉換檢核報告（文本格式）
   */
  exportTextReport() {
    const report = this.generateReport();
    if (!report) return null;

    let text = `\
工程設施座標轉換檢核報告
${'='.repeat(60)}

報告時間：${new Date().toLocaleString('zh-TW')}
轉換方法：標準Transverse Mercator投影轉換
座標系統：EPSG:3826 (TWD97 TM2, Zone 121) → EPSG:4326 (WGS84)

轉換參數：
  中央經線：121°E
  椭球體：GRS80
  縮放因子：0.9999
  假東(False Easting)：250000m
  假北(False Northing)：0m

精度統計：
  總設施數：${report.statistics.totalFacilities}
  平均誤差：${report.statistics.averageError.toFixed(2)}米
  最大誤差：${report.statistics.maxError.toFixed(2)}米
  超出容許範圍：${report.statistics.outOfToleranceCount}筆
  整體評估：${report.statistics.quality === 'PASS' ? '✓ 合格' : '⚠ 需檢查'}

詳細成果：
${'─'.repeat(60)}\n`;

    report.facilities.forEach(f => {
      text += `
${f.name} (ID:${f.id}, 里程:${f.stationKm || 'N/A'})
  TWD97座標：E ${f.twd97.x}, N ${f.twd97.y}
  當前WGS84：${f.currentWGS84.lat.toFixed(5)}° N, ${f.currentWGS84.lng.toFixed(5)}° E
  標準轉換：${f.standardWGS84.lat.toFixed(5)}° N, ${f.standardWGS84.lng.toFixed(5)}° E
  座標誤差：${f.errorDistance.toFixed(2)}米 ${f.isAccurate ? '✓' : '⚠'}
`;
    });

    return text;
  }
};

// 页面加载完成后自动生成报告
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('%c[座標審核] 若要檢視完整座標轉換報告，請執行：CoordinateAudit.generateReport()', 'color:#1565c0;font-size:12px;font-weight:bold');
    console.log('%c[座標匯出] 導出座標表：CoordinateAudit.exportCoordinatesTable()', 'color:#e65100;font-size:12px');
    console.log('%c[報告匯出] 導出檢核報告：CoordinateAudit.exportTextReport()', 'color:#2e7d32;font-size:12px');
  }, 800);
});
