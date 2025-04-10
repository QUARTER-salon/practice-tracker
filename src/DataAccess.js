/**
 * 美容師練習管理Webアプリケーション
 * データアクセス関連のGASファイル
 * 
 * このスクリプトはGoogleスプレッドシートへのデータ操作に関連する機能を提供します。
 */

/**
 * 練習記録を保存する
 * 
 * @param {Object} recordData - 練習記録データ
 * @return {Object} 保存結果
 */
function savePracticeRecord(recordData) {
  try {
    // ログインチェック
    const userSession = checkSession();
    
    if (!userSession) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // バリデーション
    const validationResult = validatePracticeRecord(recordData, userSession);
    if (!validationResult.valid) {
      return { success: false, message: validationResult.message };
    }
    
    // 練習記録シートにデータを追加
    const practiceSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PRACTICE_RECORD_SHEET_NAME);;
    
    // 記録日時（現在時刻）を生成
    const timestamp = new Date();
    
    // シートに追加するデータ行を作成
    const newRow = [
      timestamp,                     // 記録日時
      userSession.店舗,               // 店舗
      userSession.Role,              // 役職
      userSession.名前,               // 名前
      userSession.社員番号,            // 社員番号
      recordData.trainer,            // トレーナー
      new Date(recordData.practiceDate), // 練習日
      parseFloat(recordData.practiceTime), // 練習時間
      recordData.techCategory,       // 技術カテゴリー
      recordData.techDetail,         // 詳細技術項目
      parseInt(recordData.practiceCount), // 練習回数
      parseInt(recordData.newWigCount) || 0, // 新品ウィッグ使用数
      recordData.trainer === '自主練' ? '' : parseInt(recordData.evaluation), // 評価
      recordData.otherDetails || '', // その他詳細
      '1.0'                          // アプリバージョン
    ];
    
    // データを追加
    practiceSheet.appendRow(newRow);
    
    // 新品ウィッグ使用数が指定されている場合、在庫を更新
    if (recordData.newWigCount && parseInt(recordData.newWigCount) > 0) {
      updateWigInventory(userSession.店舗, parseInt(recordData.newWigCount));
    }
    
    return { success: true, message: '練習記録が保存されました' };
  } catch (e) {
    console.error('練習記録保存エラー: ' + e);
    return { success: false, message: '練習記録の保存中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 練習記録データのバリデーションを行う
 * 
 * @param {Object} recordData - 練習記録データ
 * @param {Object} userSession - ユーザーセッション情報
 * @return {Object} バリデーション結果
 */
function validatePracticeRecord(recordData, userSession) {
  // 必須項目の確認
  const requiredFields = [
    'trainer',        // トレーナー
    'practiceDate',   // 練習日
    'practiceTime',   // 練習時間
    'techCategory',   // 技術カテゴリー
    'techDetail',     // 詳細技術項目
    'practiceCount'   // 練習回数
  ];
  
  for (const field of requiredFields) {
    if (!recordData[field]) {
      return { valid: false, message: '必須項目が入力されていません' };
    }
  }
  
  // トレーナーが自主練でない場合、評価は必須
  if (recordData.trainer !== '自主練' && !recordData.evaluation) {
    return { valid: false, message: 'トレーナー指導の場合は評価の入力が必要です' };
  }
  
  // 日付のフォーマット確認
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(recordData.practiceDate)) {
    return { valid: false, message: '練習日の形式が正しくありません（例: 2023-04-01）' };
  }
  
  // 練習時間が数値であることを確認
  const practiceTime = parseFloat(recordData.practiceTime);
  if (isNaN(practiceTime) || practiceTime < 0 || practiceTime > 12) {
    return { valid: false, message: '練習時間は0から12の間で入力してください' };
  }
  
  // 練習回数が数値であることを確認
  const practiceCount = parseInt(recordData.practiceCount);
  if (isNaN(practiceCount) || practiceCount < 0 || practiceCount > 8) {
    return { valid: false, message: '練習回数は0から8の間で入力してください' };
  }
  
  // 新品ウィッグ使用数が数値であることを確認（入力されている場合）
  if (recordData.newWigCount) {
    const newWigCount = parseInt(recordData.newWigCount);
    if (isNaN(newWigCount) || newWigCount < 0 || newWigCount > 5) {
      return { valid: false, message: '新品ウィッグ使用数は0から5の間で入力してください' };
    }
  }
  
  // 評価が数値であることを確認（自主練でない場合）
  if (recordData.trainer !== '自主練' && recordData.evaluation) {
    const evaluation = parseInt(recordData.evaluation);
    if (isNaN(evaluation) || evaluation < 1 || evaluation > 10) {
      return { valid: false, message: '評価は1から10の間で入力してください' };
    }
  }
  
  return { valid: true };
}

/**
 * ウィッグ在庫を更新する
 * 
 * @param {string} store - 店舗名
 * @param {number} usedCount - 使用したウィッグ数
 * @return {boolean} 更新成功ならtrue
 */
function updateWigInventory(store, usedCount) {
  try {
    // ウィッグ在庫シートを取得
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗');
    const stockIndex = headers.indexOf('在庫数');
    
    if (storeIndex === -1 || stockIndex === -1) {
      console.error('ウィッグ在庫シートの形式が正しくありません');
      return false;
    }
    
    // 該当店舗の行を検索
    let rowIndex = -1;
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][storeIndex] === store) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      // 該当店舗がない場合は新規追加
      inventorySheet.appendRow([store, 0 - usedCount]);
    } else {
      // 既存の在庫数から使用数を減算
      const currentStock = inventoryData[rowIndex - 1][stockIndex];
      const newStock = currentStock - usedCount;
      
      // 在庫数を更新
      inventorySheet.getRange(rowIndex, stockIndex + 1).setValue(newStock);
    }
    
    return true;
  } catch (e) {
    console.error('ウィッグ在庫更新エラー: ' + e);
    return false;
  }
}

/**
 * 店舗ごとのウィッグ在庫を取得する
 * 
 * @return {Object} ウィッグ在庫情報
 */
function getWigInventory() {
  try {
    // ログインチェック
    const userSession = checkSession();
    
    if (!userSession) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // ウィッグ在庫シートを取得
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗');
    const stockIndex = headers.indexOf('在庫数');
    
    if (storeIndex === -1 || stockIndex === -1) {
      return { success: false, message: 'ウィッグ在庫シートの形式が正しくありません' };
    }
    
    // 在庫データを配列に変換
    const inventory = [];
    for (let i = 1; i < inventoryData.length; i++) {
      inventory.push({
        store: inventoryData[i][storeIndex],
        stock: inventoryData[i][stockIndex]
      });
    }
    
    return {
      success: true,
      data: inventory
    };
  } catch (e) {
    console.error('ウィッグ在庫取得エラー: ' + e);
    return { success: false, message: 'ウィッグ在庫の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 練習記録の一覧を取得する（管理者用）
 * 
 * @param {Object} options - 検索オプション（期間など）
 * @return {Object} 練習記録一覧
 */
function getPracticeRecords(options = {}) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // 練習記録シートを取得
    const practiceSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PRACTICE_RECORD_SHEET_NAME);
    const practiceData = practiceSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = practiceData[0];
    
    // データ行を取得（ヘッダーを除く）
    const records = [];
    for (let i = 1; i < practiceData.length; i++) {
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = practiceData[i][j];
      }
      records.push(record);
    }
    
    // 検索オプションによるフィルタリング
    let filteredRecords = records;
    
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record['練習日']);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    if (options.store) {
      filteredRecords = filteredRecords.filter(record => record['店舗'] === options.store);
    }
    
    if (options.role) {
      filteredRecords = filteredRecords.filter(record => record['役職'] === options.role);
    }
    
    if (options.staff) {
      filteredRecords = filteredRecords.filter(record => record['名前'] === options.staff);
    }
    
    if (options.techCategory) {
      filteredRecords = filteredRecords.filter(record => record['技術カテゴリー'] === options.techCategory);
    }
    
    return {
      success: true,
      data: filteredRecords
    };
  } catch (e) {
    console.error('練習記録取得エラー: ' + e);
    return { success: false, message: '練習記録の取得中にエラーが発生しました: ' + e.toString() };
  }
}