/**
 * 美容師練習管理Webアプリケーション
 * データアクセス関連のGASファイル
 * 
 * このスクリプトはGoogleスプレッドシートへの主要なデータ操作（練習記録の保存・取得、在庫更新など）を担当します。
 */

/**
 * 練習記録をバリデーションし、スプレッドシートに保存する
 * 
 * @param {Object} recordData - フロントエンドから送信された練習記録データオブジェクト
 * @return {Object} 保存結果 { success: boolean, message?: string }
 */
function savePracticeRecord(recordData) {
  try {
    // ログインセッションを確認 (Auth.js の関数)
    const userSession = checkSession();
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。セッションがタイムアウトした可能性があります。再度ログインしてください。' };
    }
    
    // フロントエンドから受け取ったデータをログ出力（デバッグ用）
    // Logger.log('受信した練習記録データ: ' + JSON.stringify(recordData));
    
    // 入力データのバリデーション
    const validationResult = validatePracticeRecord(recordData, userSession);
    if (!validationResult.valid) {
      // バリデーションエラーの場合は理由を返す
      return { success: false, message: validationResult.message };
    }
    
    // 練習記録シートを取得
    const practiceSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PRACTICE_RECORD_SHEET_NAME);
    if (!practiceSheet) {
        return { success: false, message: '練習記録シートが見つかりません。設定を確認してください。' };
    }
    
    // 記録日時（サーバー時刻）を生成
    const timestamp = new Date();
    
    // スプレッドシートに追加するデータ行を作成
    // 列の順序は要件定義書 5.3 に合わせる
    const newRow = [
      timestamp,                                           // 記録日時
      userSession.店舗 || '',                              // 店舗 (セッション情報から)
      userSession.Role || '',                              // 役職 (セッション情報から。列名注意)
      userSession.名前 || '',                              // 名前 (セッション情報から)
      userSession.社員番号 || '',                          // 社員番号 (セッション情報から)
      recordData.trainer,                                  // トレーナー
      new Date(recordData.practiceDate),                   // 練習日 (Dateオブジェクトに変換)
      parseFloat(recordData.practiceTime),                 // 練習時間 (数値に変換)
      recordData.techCategory,                             // 技術カテゴリー
      recordData.techDetail,                               // 詳細技術項目
      parseInt(recordData.practiceCount),                  // 練習回数 (数値に変換)
      parseInt(recordData.newWigCount) || 0,               // 新品ウィッグ使用数 (数値に変換、未指定時は0)
      recordData.trainer === '自主練' ? '' : parseInt(recordData.evaluation), // 評価 (自主練時は空、他は数値)
      recordData.otherDetails || '',                       // その他詳細 (未指定時は空文字)
      // '1.0'                                             // (任意) アプリバージョン - 必要なら追加
    ];
    
    // データを最終行に追加
    practiceSheet.appendRow(newRow);
    
    // 新品ウィッグ使用数が 1 以上の場合、在庫を非同期で更新
    const usedWigCount = parseInt(recordData.newWigCount) || 0;
    if (usedWigCount > 0) {
      // ユーザーの操作をブロックしないように別プロセスで実行する (ただし、GASでは完全な非同期は難しい)
      // ここでは単純に関数を呼び出すが、エラーは握りつぶす（在庫更新失敗が記録保存を妨げないように）
      try {
        updateWigInventoryOnRecord(userSession.店舗, usedWigCount);
      } catch (wigError) {
        console.error('在庫更新中のエラー（記録保存は成功）: ' + wigError);
        // ユーザーには通知せず、ログのみ記録
      }
    }
    
    // 成功メッセージを返す
    return { success: true, message: '練習記録が正常に保存されました。' };
    
  } catch (e) {
    console.error('練習記録保存エラー (savePracticeRecord): ' + e);
    Logger.log('練習記録保存エラー: ' + e.stack); // スタックトレースも記録
    return { success: false, message: '練習記録の保存中に予期せぬエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 練習記録データの入力値をバリデーションする
 * 
 * @param {Object} recordData - 練習記録データオブジェクト
 * @param {Object} userSession - ユーザーセッション情報
 * @return {Object} バリデーション結果 { valid: boolean, message?: string }
 */
function validatePracticeRecord(recordData, userSession) {
  // 必須項目の存在チェック
  const requiredFields = {
    trainer: 'トレーナー',
    practiceDate: '練習日',
    practiceTime: '練習時間',
    techCategory: '技術カテゴリー',
    techDetail: '詳細技術項目',
    practiceCount: '練習回数'
  };
  
  for (const field in requiredFields) {
    if (!recordData[field]) {
      return { valid: false, message: requiredFields[field] + 'が選択または入力されていません。' };
    }
  }
  
  // トレーナーが「他店舗トレーナー」の場合、実際のトレーナー名も必須（フロントで制御済みだが念のため）
  // ※ recordData.trainer には最終的なトレーナー名が入る想定
  
  // トレーナーが「自主練」でない場合、評価は必須
  if (recordData.trainer !== '自主練') {
      if (!recordData.evaluation) {
          return { valid: false, message: 'トレーナー指導の場合は評価を選択してください。' };
      }
      // 評価の値チェック (1-10)
      const evaluation = parseInt(recordData.evaluation);
      if (isNaN(evaluation) || evaluation < 1 || evaluation > 10) {
          return { valid: false, message: '評価は1から10の間で選択してください。' };
      }
  }
  
  // 練習日のフォーマット確認 (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(recordData.practiceDate)) {
    return { valid: false, message: '練習日の形式が正しくありません（例: 2023-04-01）。' };
  }
  // 未来の日付でないかチェック (任意)
  const practiceDate = new Date(recordData.practiceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻をリセットして日付のみで比較
  if (practiceDate > today) {
      return { valid: false, message: '未来の日付は練習日として記録できません。' };
  }
  
  // 練習時間の値チェック (0-12 の 0.5刻み)
  const practiceTime = parseFloat(recordData.practiceTime);
  if (isNaN(practiceTime) || practiceTime < 0 || practiceTime > 12 || (practiceTime * 10) % 5 !== 0) {
    // 0.5刻みかのチェックを追加 ((practiceTime * 10) % 5 === 0)
    return { valid: false, message: '練習時間は0から12の間で0.5時間刻みで選択してください。' };
  }
  
  // 練習回数の値チェック (0-8)
  const practiceCount = parseInt(recordData.practiceCount);
  if (isNaN(practiceCount) || practiceCount < 0 || practiceCount > 8) {
    return { valid: false, message: '練習回数は0から8の間で選択してください。' };
  }
  
  // 新品ウィッグ使用数の値チェック (0-5, 入力されている場合)
  if (recordData.newWigCount && recordData.newWigCount !== '0') { // 0以外の場合のみチェック
    const newWigCount = parseInt(recordData.newWigCount);
    if (isNaN(newWigCount) || newWigCount < 0 || newWigCount > 5) {
      return { valid: false, message: '新品ウィッグ使用数は0から5の間で選択してください。' };
    }
  }
  
  // その他詳細の文字数チェック (任意)
  const maxOtherDetailsLength = 500; // 例: 500文字まで
  if (recordData.otherDetails && recordData.otherDetails.length > maxOtherDetailsLength) {
      return { valid: false, message: 'その他詳細は' + maxOtherDetailsLength + '文字以内で入力してください。' };
  }

  // TODO: 選択されたトレーナー、カテゴリー、詳細項目がマスターデータに存在するかチェック（より厳密にする場合）
  // 例: const trainers = getTrainersFromMaster(); if (!trainers.includes(recordData.trainer)) { ... }
  
  // すべてのチェックをパス
  return { valid: true };
}

/**
 * 練習記録保存時にウィッグ在庫を更新する（使用数を減算）
 * 記録保存処理の一部として呼び出される。エラーはログに残すが、記録保存は妨げない。
 * 
 * @param {string} store - 店舗名
 * @param {number} usedCount - 使用したウィッグ数 (正の整数)
 * @return {void}
 */
function updateWigInventoryOnRecord(store, usedCount) {
  if (!store || !usedCount || usedCount <= 0) {
    console.warn('在庫更新スキップ: 店舗名または使用数が無効です。', store, usedCount);
    return; // 無効な入力の場合は何もしない
  }
  
  try {
    // ウィッグ在庫シートを取得
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗');
    const stockIndex = headers.indexOf('在庫数');
    
    if (storeIndex === -1 || stockIndex === -1) {
      console.error('在庫更新エラー: ウィッグ在庫シートの形式が正しくありません。');
      return; // シート形式が不正な場合は更新不可
    }
    
    let rowIndex = -1;
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][storeIndex] === store) {
        rowIndex = i + 1; // シート行番号 (1-based)
        break;
      }
    }
    
    if (rowIndex === -1) {
      // 該当店舗がない場合は新規追加（在庫はマイナスで記録される）
      console.warn('在庫更新: 店舗「' + store + '」が見つからないため、新規追加します（在庫:' + (0 - usedCount) + '）。');
      inventorySheet.appendRow([store, 0 - usedCount]);
    } else {
      // 既存の在庫数から使用数を減算
      const currentStockCell = inventorySheet.getRange(rowIndex, stockIndex + 1);
      const currentStock = Number(currentStockCell.getValue()); // 数値に変換
      
      if (isNaN(currentStock)) {
          console.error('在庫更新エラー: 店舗「' + store + '」の現在の在庫数が数値ではありません。値:', currentStockCell.getValue());
          return; // 現在庫が数値でない場合は更新中断
      }
      
      const newStock = currentStock - usedCount;
      currentStockCell.setValue(newStock);
      // Logger.log('在庫更新: 店舗「' + store + '」 在庫 ' + currentStock + ' -> ' + newStock);
    }
    
  } catch (e) {
    // この関数内で発生したエラーは呼び出し元に伝播させず、ログのみ記録
    console.error('在庫更新中の内部エラー (updateWigInventoryOnRecord): ' + e);
    Logger.log('在庫更新中の内部エラー: ' + e.stack);
  }
}

/**
 * 店舗ごとのウィッグ在庫を取得する（管理者画面用）
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<{store: string, stock: number}>, message?: string }
 */
function getWigInventory() {
  try {
    // 管理者権限チェックは AdminHandler.js で行う想定だが、念のためここでもチェック
    if (!checkAdminAccess()) { // Utils.js の関数
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗');
    const stockIndex = headers.indexOf('在庫数');
    
    if (storeIndex === -1 || stockIndex === -1) {
      return { success: false, message: 'ウィッグ在庫シートの形式が正しくありません（「店舗」または「在庫数」列が見つかりません）。' };
    }
    
    const inventory = [];
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][storeIndex]) { // 店舗名がある行のみ
        const stockValue = inventoryData[i][stockIndex];
        inventory.push({
          store: inventoryData[i][storeIndex],
          // 在庫数が数値でなくても表示できるようにする（管理画面で気づけるように）
          stock: isNaN(Number(stockValue)) ? String(stockValue) : Number(stockValue) 
        });
      }
    }
    
    return { success: true, data: inventory };
  } catch (e) {
    console.error('ウィッグ在庫取得エラー: ' + e);
    return { success: false, message: 'ウィッグ在庫の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 練習記録の一覧を取得する（管理者用、フィルタリング機能付き）
 * 
 * @param {Object} options - 検索オプション (例: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', store: '店舗名', ... })
 * @return {Object} 結果 { success: boolean, data?: Array<Object>, message?: string }
 */
function getPracticeRecords(options = {}) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) { // Utils.js の関数
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const practiceSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PRACTICE_RECORD_SHEET_NAME);
    // 全データを取得 (メモリ使用量に注意。データ量が多い場合は改善が必要)
    const practiceData = practiceSheet.getDataRange().getValues(); 
    
    if (practiceData.length <= 1) {
        // ヘッダーのみ、またはデータがない場合
        return { success: true, data: [] };
    }

    const headers = practiceData[0];
    
    // データをオブジェクトの配列に変換
    const records = practiceData.slice(1).map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
    
    // 検索オプションによるフィルタリング
    let filteredRecords = records;
    
    // 日付範囲フィルタ
    if (options.startDate && options.endDate) {
      try {
          const startDate = new Date(options.startDate);
          startDate.setHours(0,0,0,0); // 開始日の0時0分0秒
          const endDate = new Date(options.endDate);
          endDate.setHours(23,59,59,999); // 終了日の23時59分59秒

          // '練習日' 列のインデックスを取得 (動的に)
          const practiceDateIndex = headers.indexOf('練習日');
          if (practiceDateIndex !== -1) {
              filteredRecords = filteredRecords.filter(record => {
                  const recordDate = record['練習日']; // Dateオブジェクトのはず
                  // Dateオブジェクトでない場合のフォールバック
                  const dateObj = (recordDate instanceof Date) ? recordDate : new Date(recordDate); 
                  return !isNaN(dateObj) && dateObj >= startDate && dateObj <= endDate;
              });
          } else {
              console.warn("getPracticeRecords: '練習日' 列が見つかりません。日付フィルタはスキップされます。");
          }
      } catch (dateError) {
           console.error("日付フィルタエラー:", dateError);
           // 日付形式が無効な場合はフィルタしない or エラーを返す
      }
    }
    
    // 店舗フィルタ
    if (options.store) {
      const storeIndex = headers.indexOf('店舗');
      if (storeIndex !== -1) {
        filteredRecords = filteredRecords.filter(record => record['店舗'] === options.store);
      }
    }
    
    // 役職フィルタ
    if (options.role) {
      const roleIndex = headers.indexOf('役職');
      if (roleIndex !== -1) {
        filteredRecords = filteredRecords.filter(record => record['役職'] === options.role);
      }
    }
    
    // スタッフ名フィルタ
    if (options.staff) {
      const nameIndex = headers.indexOf('名前');
      if (nameIndex !== -1) {
        filteredRecords = filteredRecords.filter(record => record['名前'] === options.staff);
      }
    }
    
    // 技術カテゴリーフィルタ
    if (options.techCategory) {
      const categoryIndex = headers.indexOf('技術カテゴリー');
      if (categoryIndex !== -1) {
        filteredRecords = filteredRecords.filter(record => record['技術カテゴリー'] === options.techCategory);
      }
    }

    // TODO: 必要に応じて他の列でのフィルタも追加
    
    return { success: true, data: filteredRecords };
      
  } catch (e) {
    console.error('練習記録取得エラー (getPracticeRecords): ' + e);
    Logger.log('練習記録取得エラー: ' + e.stack);
    return { success: false, message: '練習記録の取得中に予期せぬエラーが発生しました: ' + e.toString() };
  }
}