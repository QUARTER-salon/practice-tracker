/**
 * 美容師練習管理Webアプリケーション
 * 管理者機能用のGASファイル
 * 
 * このスクリプトは管理者向け機能（マスターデータ管理、在庫管理など）を提供します。
 */

// ==================================
// --- 店舗管理 ---
// ==================================

/**
 * 店舗一覧を取得する
 * @return {Object} 結果 { success: boolean, data?: Array<string>, message?: string }
 */
function getStores() {
  Logger.log('getStores: 開始'); 
  try {
    if (!checkAdminAccess()) { // Utils.js
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) throw new Error('店舗マスターシートが見つかりません。'); // シート存在チェック
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名'); 
    
    if (nameIndex === -1) { 
      Logger.log('getStores: 店舗マスターシート形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません（「店舗名」列が見つかりません）。' };
    }
    
    const stores = [];
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][nameIndex]) { stores.push(storeData[i][nameIndex]); }
    }
    Logger.log('getStores: 取得した店舗数=' + stores.length);
    
    return { success: true, data: stores };
  } catch (e) { 
    console.error('店舗一覧取得エラー: ' + e);
    Logger.log('getStores: エラー - ' + e.toString());
    return { success: false, message: '店舗一覧の取得中にエラーが発生しました: ' + e.message }; // e.message を返す
  }
}

/**
 * 店舗を追加する
 * @param {string} storeName - 追加する店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addStore(storeName) {
   Logger.log('addStore: 開始 - 店舗名=' + storeName);
  try {
    if (!checkAdminAccess()) { 
      return { success: false, message: '管理者権限が必要です。' };
    }
    if (!storeName || typeof storeName !== 'string' || storeName.trim() === '') { 
      return { success: false, message: '店舗名を入力してください。' };
    }
    storeName = storeName.trim(); 
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) throw new Error('店舗マスターシートが見つかりません。');
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) { 
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック
    const existingStores = storeData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingStores.includes(storeName.toLowerCase())) { 
       Logger.log('addStore: 店舗名重複');
      return { success: false, message: 'この店舗名は既に登録されています。' };
    }
    
    storeSheet.appendRow([storeName]);
    Logger.log('addStore: 店舗マスターに追加完了');

    // 在庫シートへの追加
    try { 
        const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
        if(inventorySheet){
            const inventoryData = inventorySheet.getDataRange().getValues();
            const invHeaders = inventoryData[0];
            const invStoreIndex = invHeaders.indexOf('店舗');
            let storeExistsInInventory = false;
            if (invStoreIndex !== -1) { /* ... 重複チェック ... */ }
            if (!storeExistsInInventory && invStoreIndex !== -1) {
                inventorySheet.appendRow([storeName, 0]);
                Logger.log('addStore: ウィッグ在庫に初期値追加完了');
            }
        } else { Logger.log('addStore: 在庫シートなし'); }
    } catch (invError) { /* ... エラーログ ... */ }
    
    return { success: true, message: '店舗「' + storeName + '」が追加されました。' }; 
  } catch (e) { 
    console.error('店舗追加エラー: ' + e);
    Logger.log('addStore: エラー - ' + e.toString());
    return { success: false, message: '店舗の追加中にエラーが発生しました: ' + e.message };
  }
}

/**
 * 店舗名を更新する
 * @param {string} originalName - 更新前の店舗名
 * @param {string} newName - 更新後の新しい店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateStore(originalName, newName) {
  Logger.log('updateStore: 開始 - 元=[' + originalName + '], 新=[' + newName + ']');
  try {
    if (!checkAdminAccess()) { 
      return { success: false, message: '管理者権限が必要です。' };
    }
    if (!originalName || !newName || typeof originalName !== 'string' || typeof newName !== 'string' || originalName.trim() === '' || newName.trim() === '') {
      Logger.log('updateStore: 引数不正');
      return { success: false, message: '更新前後の店舗名が必要です。' };
    }
    originalName = originalName.trim();
    newName = newName.trim();
    if (originalName === newName) {
        Logger.log('updateStore: 店舗名に変更なし');
        return { success: true, message: '店舗名に変更はありませんでした。' }; 
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const storeSheet = ss.getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) throw new Error('店舗マスターシートが見つかりません。');
    const storeData = storeSheet.getDataRange().getValues();
    const storeHeaders = storeData[0];
    const storeNameIndex = storeHeaders.indexOf('店舗名');
    if (storeNameIndex === -1) { 
      Logger.log('updateStore: 店舗マスター形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }

    // 重複チェック と 更新対象行特定
    let originalRowIndex = -1;
    for (let i = 1; i < storeData.length; i++) { 
       const currentStoreName = storeData[i][storeNameIndex];
        if (currentStoreName === originalName) {
            originalRowIndex = i + 1; 
        } else if (currentStoreName === newName) {
            Logger.log('updateStore: 新しい店舗名重複');
            return { success: false, message: '新しい店舗名「' + newName + '」は既に存在します。' };
        }
    }
    if (originalRowIndex === -1) { 
       Logger.log('updateStore: 更新対象なし');
       return { success: false, message: '更新対象の店舗「' + originalName + '」が見つかりません。' };
    }

    let updateMessages = []; 

    // 1. 店舗マスター更新
    try { 
        storeSheet.getRange(originalRowIndex, storeNameIndex + 1).setValue(newName);
        Logger.log('updateStore: 店舗マスターシート更新完了');
        updateMessages.push('店舗マスター更新');
    } catch(e) { 
        Logger.log('updateStore: 店舗マスターシート更新エラー: ' + e);
        throw new Error('店舗マスターの更新に失敗しました。処理を中断します。');
    }

    // 2. 在庫シート更新
    try { 
       const inventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
        if (inventorySheet) {
            const inventoryData = inventorySheet.getDataRange().getValues();
            const invHeaders = inventoryData[0];
            const invStoreIndex = invHeaders.indexOf('店舗');
            if (invStoreIndex !== -1) {
                for (let i = 1; i < inventoryData.length; i++) {
                    if (inventoryData[i][invStoreIndex] === originalName) {
                        inventorySheet.getRange(i + 1, invStoreIndex + 1).setValue(newName);
                        Logger.log('updateStore: 在庫シート更新完了 (行' + (i+1) + ')');
                        updateMessages.push('在庫シート更新');
                        break; 
                    }
                }
            } else { Logger.log('updateStore: 在庫シートに「店舗」列なし'); }
        } else { Logger.log('updateStore: 在庫シートなし'); }
    } catch(e) { 
        Logger.log('updateStore: 在庫シート更新エラー（無視）: ' + e);
        updateMessages.push('在庫更新エラー');
    }

    // 3. トレーナーマスター更新
    try { 
       const trainerSheet = ss.getSheetByName(TRAINER_MASTER_SHEET_NAME);
        if (trainerSheet) {
             const trainerData = trainerSheet.getDataRange().getValues();
            const trainerHeaders = trainerData[0];
            const trainerStoreIndex = trainerHeaders.indexOf('店舗');
             if (trainerStoreIndex !== -1) {
                let updatedCount = 0;
                for (let i = 1; i < trainerData.length; i++) { /* ... 更新処理 ... */ }
                if (updatedCount > 0) { /* ... ログ & メッセージ ... */ }
             } else { /* ... ログ ... */ }
        } else { /* ... ログ ... */ }
    } catch(e) { /* ... エラーログ & メッセージ ... */ }
    
    // 4. スタッフマスター更新
    try { 
       const staffSheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
        if (staffSheet) {
            const staffData = staffSheet.getDataRange().getValues();
            const staffHeaders = staffData[0];
            const staffStoreIndex = staffHeaders.indexOf('店舗'); // ★★★ 要確認 ★★★
             if (staffStoreIndex !== -1) {
                 let updatedCount = 0;
                 for (let i = 1; i < staffData.length; i++) { /* ... 更新処理 ... */ }
                 if (updatedCount > 0) { /* ... ログ & メッセージ ... */ }
             } else { /* ... ログ ... */ }
        } else { /* ... ログ ... */ }
    } catch(e) { /* ... エラーログ & メッセージ ... */ }
    
    return { success: true, message: '店舗情報が更新されました。\n関連シート: (' + updateMessages.join(', ') + ')' };
  } catch (e) { 
    console.error('店舗更新全体エラー (updateStore): ' + e);
    Logger.log('updateStore: 全体エラー - ' + e.toString() + '\n' + e.stack); 
    return { success: false, message: '店舗情報の更新中にエラーが発生しました: ' + e.message }; 
  }
}


/**
 * 店舗を削除する
 * @param {string} storeName - 削除する店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteStore(storeName) {
   Logger.log('deleteStore: 開始 - 店舗名=' + storeName);
  try {
    if (!checkAdminAccess()) { 
         return { success: false, message: '管理者権限が必要です。' };
     }
    if (!storeName) { 
         return { success: false, message: '削除する店舗名を指定してください。' };
     }
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) throw new Error('店舗マスターシートが見つかりません。');
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    if (nameIndex === -1) { 
       return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }
    
    let rowIndexToDelete = -1;
    for (let i = storeData.length - 1; i >= 1; i--) { 
      if (storeData[i][nameIndex] === storeName) {
        rowIndexToDelete = i + 1; 
        break;
      }
    }
    if (rowIndexToDelete === -1) { 
       Logger.log('deleteStore: 削除対象の店舗「' + storeName + '」が見つかりません。');
      return { success: false, message: '指定された店舗が見つかりません。' };
    }
    
    // TODO: 使用中チェックの実装
    
    storeSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteStore: 店舗マスターから削除完了');
    
    // 在庫シートから削除
    try { 
        const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
        if(inventorySheet) { /* ... 削除処理 ... */ }
    } catch (invError) { /* ... エラーログ ... */ }
    
    return { success: true, message: '店舗「' + storeName + '」が削除されました。' }; 
  } catch (e) { 
    console.error('店舗削除エラー: ' + e);
    Logger.log('deleteStore: エラー - ' + e.toString());
    return { success: false, message: '店舗の削除中にエラーが発生しました: ' + e.message };
  }
}

// ==================================
// --- 役職管理 ---
// ==================================

/**
 * 役職一覧を取得する
 * @return {Object} 結果 { success: boolean, data?: Array<string>, message?: string }
 */
function getRoles() {
  Logger.log('getRoles: 開始');
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    if (!roleSheet) throw new Error('役職マスターシートが見つかりません。');
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名'); 
    if (nameIndex === -1) { 
        Logger.log('getRoles: 役職マスターシート形式不正');
        return { success: false, message: '役職マスターシートの形式が正しくありません（「役職名」列が見つかりません）。' };
     }
    
    const roles = [];
    for (let i = 1; i < roleData.length; i++) {
      if (roleData[i][nameIndex]) { roles.push(roleData[i][nameIndex]); }
    }
     Logger.log('getRoles: 取得した役職数=' + roles.length);
    
    return { success: true, data: roles };
  } catch (e) { 
      console.error('役職一覧取得エラー: ' + e);
      Logger.log('getRoles: エラー - ' + e.toString());
      return { success: false, message: '役職一覧の取得中にエラーが発生しました: ' + e.message };
   }
}

/**
 * 役職を追加する
 * @param {string} roleName - 追加する役職名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addRole(roleName) {
   Logger.log('addRole: 開始 - 役職名=' + roleName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!roleName || typeof roleName !== 'string' || roleName.trim() === '') { 
        return { success: false, message: '役職名を入力してください。' };
     }
    roleName = roleName.trim();
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
     if (!roleSheet) throw new Error('役職マスターシートが見つかりません。');
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    if (nameIndex === -1) { 
        return { success: false, message: '役職マスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック
    const existingRoles = roleData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingRoles.includes(roleName.toLowerCase())) { 
       Logger.log('addRole: 役職名重複');
       return { success: false, message: 'この役職名は既に登録されています。' };
    }
    
    roleSheet.appendRow([roleName]);
     Logger.log('addRole: 役職マスターに追加完了');
    
    return { success: true, message: '役職「' + roleName + '」が追加されました。' };
  } catch (e) { 
      console.error('役職追加エラー: ' + e);
      Logger.log('addRole: エラー - ' + e.toString());
      return { success: false, message: '役職の追加中にエラーが発生しました: ' + e.message };
   }
}

/**
 * 役職名を更新する
 * 関連する他のシートの役職名も更新する
 * @param {string} originalName - 更新前の役職名
 * @param {string} newName - 更新後の新しい役職名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateRole(originalName, newName) {
  Logger.log('updateRole: 開始 - 元=[' + originalName + '], 新=[' + newName + ']');
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!originalName || !newName || typeof originalName !== 'string' || typeof newName !== 'string' || originalName.trim() === '' || newName.trim() === '') { /* ... 引数チェック ... */ }
    originalName = originalName.trim();
    newName = newName.trim();
    if (originalName === newName) { /* ... 変更なし ... */ }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const roleSheet = ss.getSheetByName(ROLE_MASTER_SHEET_NAME);
    if (!roleSheet) throw new Error('役職マスターシートが見つかりません。');
    const roleData = roleSheet.getDataRange().getValues();
    const roleHeaders = roleData[0];
    const roleNameIndex = roleHeaders.indexOf('役職名');
    if (roleNameIndex === -1) { /* ... 形式エラー ... */ }

    // 重複チェック & 更新対象行特定
    let originalRowIndex = -1;
    for (let i = 1; i < roleData.length; i++) { /* ... */ }
    if (originalRowIndex === -1) { /* ... 対象なしエラー ... */ }

    let updateMessages = []; 

    // 1. 役職マスター更新
    try { 
        roleSheet.getRange(originalRowIndex, roleNameIndex + 1).setValue(newName);
        Logger.log('updateRole: 役職マスター更新完了');
        updateMessages.push('役職マスター更新');
    } catch(e) { /* ... エラー処理 & throw ... */ }

    // 2. スタッフマスター更新
    try { 
        const staffSheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
        if (staffSheet) { /* ... 更新処理 ... */ } else { /* ... ログ ... */ }
    } catch(e) { /* ... エラーログ & メッセージ ... */ }
    
    // 3. 技術カテゴリーマスター更新
    try { 
        const categorySheet = ss.getSheetByName(TECH_CATEGORY_SHEET_NAME);
         if (categorySheet) { /* ... 更新処理 ... */ } else { /* ... ログ ... */ }
    } catch(e) { /* ... エラーログ & メッセージ ... */ }

    // 4. 詳細技術項目マスター更新
    try { 
        const detailSheet = ss.getSheetByName(TECH_DETAIL_SHEET_NAME);
         if (detailSheet) { /* ... 更新処理 ... */ } else { /* ... ログ ... */ }
    } catch(e) { /* ... エラーログ & メッセージ ... */ }

    return { success: true, message: '役職情報が更新されました。\n関連シート: (' + updateMessages.join(', ') + ')' };
  } catch (e) { 
    console.error('役職更新全体エラー (updateRole): ' + e);
    Logger.log('updateRole: 全体エラー - ' + e.toString() + '\n' + e.stack); 
    return { success: false, message: '役職情報の更新中にエラーが発生しました: ' + e.message }; 
  }
}


/**
 * 役職を削除する
 * @param {string} roleName - 削除する役職名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteRole(roleName) {
   Logger.log('deleteRole: 開始 - 役職名=' + roleName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!roleName) { return { success: false, message: '削除する役職名を指定してください。' }; }
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    if (!roleSheet) throw new Error('役職マスターシートが見つかりません。');
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    if (nameIndex === -1) { return { success: false, message: '役職マスターシートの形式が正しくありません。' }; }
    
    let rowIndexToDelete = -1;
    for (let i = roleData.length - 1; i >= 1; i--) { 
        if (roleData[i][nameIndex] === roleName) {
            rowIndexToDelete = i + 1;
            break;
        }
     }
    if (rowIndexToDelete === -1) { 
        Logger.log('deleteRole: 削除対象の役職「' + roleName + '」が見つかりません。');
        return { success: false, message: '指定された役職が見つかりません。' };
     }
    
    // TODO: 使用中チェック
    
    roleSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteRole: 役職マスターから削除完了');

    // TODO: 関連シートの役職をどうするか？
    
    return { success: true, message: '役職「' + roleName + '」が削除されました。' };
  } catch (e) { 
      console.error('役職削除エラー: ' + e);
      Logger.log('deleteRole: エラー - ' + e.toString());
      return { success: false, message: '役職の削除中にエラーが発生しました: ' + e.message };
   }
}


// ==================================
// --- 他の管理関数 (トレーナー、カテゴリ、詳細、在庫) ---
// ==================================
// (これらの関数も同様に、省略箇所を補完し、エラーハンドリングやログを追加することを推奨)
function getAllTrainers() { /* ... */ }
function addTrainer(trainerName, storeName) { /* ... */ }
function deleteTrainer(trainerName, storeName) { /* ... */ }
// TODO: updateTrainer

function getAllTechCategories() { /* ... */ }
function addTechCategory(categoryName, roles) { /* ... */ }
function deleteTechCategory(categoryName) { /* ... */ }
// TODO: updateTechCategory

function getAllTechDetails() { /* ... */ }
function addTechDetail(detailName, categoryName, roles) { /* ... */ }
function deleteTechDetail(detailName, categoryName) { /* ... */ }
// TODO: updateTechDetail

function updateWigStock(store, stockCount) { /* ... */ }