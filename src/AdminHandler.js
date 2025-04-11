/**
 * 美容師練習管理Webアプリケーション
 * 管理者機能用のGASファイル
 * 
 * このスクリプトは管理者向け機能（マスターデータ管理、在庫管理など）を提供します。
 */

/**
 * 店舗一覧を取得する
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<string>, message?: string }
 */
function getStores() {
  Logger.log('getStores: 開始'); // ログ追加
  try {
    // 管理者権限チェック (Utils.js の関数)
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名'); 
    
    if (nameIndex === -1) {
       Logger.log('getStores: 店舗マスターシート形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません（「店舗名」列が見つかりません）。' };
    }
    
    const stores = [];
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][nameIndex]) { 
        stores.push(storeData[i][nameIndex]);
      }
    }
    Logger.log('getStores: 取得した店舗数=' + stores.length);
    
    return { success: true, data: stores };
  } catch (e) {
    console.error('店舗一覧取得エラー: ' + e);
    Logger.log('getStores: エラー - ' + e.toString());
    return { success: false, message: '店舗一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗を追加する
 * 
 * @param {string} storeName - 追加する店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addStore(storeName) {
   Logger.log('addStore: 開始 - 店舗名=' + storeName);
  try {
    if (!checkAdminAccess()) { /*...*/ }
    if (!storeName || typeof storeName !== 'string' || storeName.trim() === '') { /*...*/ }
    storeName = storeName.trim(); 
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) { /*...*/ }
    
    const existingStores = storeData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingStores.includes(storeName.toLowerCase())) {
       Logger.log('addStore: 店舗名重複');
      return { success: false, message: 'この店舗名は既に登録されています。' };
    }
    
    storeSheet.appendRow([storeName]);
    Logger.log('addStore: 店舗マスターに追加完了');

    try {
        const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
        const inventoryData = inventorySheet.getDataRange().getValues();
        const invHeaders = inventoryData[0];
        const invStoreIndex = invHeaders.indexOf('店舗');
        let storeExistsInInventory = false;
        if (invStoreIndex !== -1) {
            for(let i = 1; i < inventoryData.length; i++) {
                if (inventoryData[i][invStoreIndex] === storeName) {
                    storeExistsInInventory = true;
                    break;
                }
            }
        }
        if (!storeExistsInInventory && invStoreIndex !== -1) {
            inventorySheet.appendRow([storeName, 0]);
            Logger.log('addStore: ウィッグ在庫に初期値追加完了');
        }
    } catch (invError) {
        console.error('ウィッグ在庫シートへの店舗追加エラー（無視して継続）: ' + invError);
        Logger.log('addStore: 在庫シートへの追加エラー（無視） - ' + invError.toString());
    }
    
    return { success: true, message: '店舗「' + storeName + '」が追加されました。' }; // メッセージに店舗名追加
  } catch (e) {
    console.error('店舗追加エラー: ' + e);
    Logger.log('addStore: エラー - ' + e.toString());
    return { success: false, message: '店舗の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗名を更新する
 * 関連する他のシートの店舗名も更新する
 * 
 * @param {string} originalName - 更新前の店舗名
 * @param {string} newName - 更新後の新しい店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateStore(originalName, newName) {
  Logger.log('updateStore: 開始 - 元の名前=[' + originalName + '], 新しい名前=[' + newName + ']');
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) { 
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    // 入力値チェック
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
    const storeData = storeSheet.getDataRange().getValues();
    const storeHeaders = storeData[0];
    const storeNameIndex = storeHeaders.indexOf('店舗名');

    if (storeNameIndex === -1) {
       Logger.log('updateStore: 店舗マスター形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }

    // 新しい店舗名が他の既存店舗と重複しないかチェック
    let originalRowIndex = -1;
    for (let i = 1; i < storeData.length; i++) {
      const currentStoreName = storeData[i][storeNameIndex];
      if (currentStoreName === originalName) {
          originalRowIndex = i + 1; // 更新対象行発見 (1-based index)
      } else if (currentStoreName === newName) {
          Logger.log('updateStore: 新しい店舗名「' + newName + '」が既に存在します。');
          return { success: false, message: '新しい店舗名「' + newName + '」は既に存在します。' };
      }
    }

    if (originalRowIndex === -1) {
         Logger.log('updateStore: 更新対象の店舗「' + originalName + '」が見つかりません。');
        return { success: false, message: '更新対象の店舗「' + originalName + '」が見つかりません。' };
    }

    // --- 更新処理 ---
    let updateMessages = []; 

    // 1. 店舗マスターシートの更新
    try {
        storeSheet.getRange(originalRowIndex, storeNameIndex + 1).setValue(newName);
        Logger.log('updateStore: 店舗マスターシート更新完了');
        updateMessages.push('店舗マスター更新');
    } catch(e) {
        Logger.log('updateStore: 店舗マスターシート更新エラー: ' + e);
        throw new Error('店舗マスターの更新に失敗しました。処理を中断します。'); // エラーをスローして中断
    }

    // 2. ウィッグ在庫シートの更新
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
                        Logger.log('updateStore: ウィッグ在庫シート更新完了 (行' + (i+1) + ')');
                        updateMessages.push('在庫シート更新');
                        break; 
                    }
                }
            } else { Logger.log('updateStore: 在庫シートに「店舗」列なし'); }
        } else { Logger.log('updateStore: 在庫シートなし'); }
    } catch(e) {
        Logger.log('updateStore: ウィッグ在庫シート更新中にエラー（無視して継続）: ' + e);
        updateMessages.push('在庫更新エラー');
    }

    // 3. トレーナーマスターシートの更新
    try {
        const trainerSheet = ss.getSheetByName(TRAINER_MASTER_SHEET_NAME);
        if (trainerSheet) {
            const trainerData = trainerSheet.getDataRange().getValues();
            const trainerHeaders = trainerData[0];
            const trainerStoreIndex = trainerHeaders.indexOf('店舗');
            if (trainerStoreIndex !== -1) {
                 let updatedCount = 0;
                for (let i = 1; i < trainerData.length; i++) {
                    if (trainerData[i][trainerStoreIndex] === originalName) {
                        trainerSheet.getRange(i + 1, trainerStoreIndex + 1).setValue(newName);
                        updatedCount++;
                    }
                }
                 if (updatedCount > 0) {
                    Logger.log('updateStore: トレーナーマスターシート更新完了 (' + updatedCount + '件)');
                    updateMessages.push('トレーナーマスター更新');
                 }
            } else { Logger.log('updateStore: トレーナーマスターに「店舗」列なし'); }
        } else { Logger.log('updateStore: トレーナーマスターなし'); }
    } catch(e) {
        Logger.log('updateStore: トレーナーマスターシート更新中にエラー（無視して継続）: ' + e);
        updateMessages.push('トレーナー更新エラー');
    }
    
    // 4. スタッフマスターシートの更新
    try {
        const staffSheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
        if (staffSheet) {
            const staffData = staffSheet.getDataRange().getValues();
            const staffHeaders = staffData[0];
            const staffStoreIndex = staffHeaders.indexOf('店舗'); // 列名確認
            if (staffStoreIndex !== -1) {
                let updatedCount = 0;
                for (let i = 1; i < staffData.length; i++) {
                    if (staffData[i][staffStoreIndex] === originalName) {
                        staffSheet.getRange(i + 1, staffStoreIndex + 1).setValue(newName);
                         updatedCount++;
                    }
                }
                if (updatedCount > 0) {
                    Logger.log('updateStore: スタッフマスターシート更新完了 (' + updatedCount + '件)');
                    updateMessages.push('スタッフマスター更新');
                }
            } else { Logger.log('updateStore: スタッフマスターに「店舗」列なし'); }
        } else { Logger.log('updateStore: スタッフマスターなし'); }
    } catch(e) {
        Logger.log('updateStore: スタッフマスターシート更新中にエラー（無視して継続）: ' + e);
        updateMessages.push('スタッフ更新エラー');
    }
    
    return { success: true, message: '店舗情報が更新されました。\n関連シート: (' + updateMessages.join(', ') + ')' };

  } catch (e) {
    // updateStore関数全体で発生したエラー（主に店舗マスター更新失敗時）
    console.error('店舗更新全体エラー (updateStore): ' + e);
    Logger.log('updateStore: 全体エラー - ' + e.toString() + '\n' + e.stack); 
    return { success: false, message: '店舗情報の更新中にエラーが発生しました: ' + e.message }; 
  }
}


/**
 * 店舗を削除する
 * 
 * @param {string} storeName - 削除する店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteStore(storeName) {
   Logger.log('deleteStore: 開始 - 店舗名=' + storeName);
  try {
    if (!checkAdminAccess()) { /*...*/ }
    if (!storeName) { /*...*/ }
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) { /*...*/ }
    
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
    
    // TODO: この店舗を使用しているデータがないかチェックする（スタッフ、トレーナーなど）
    // もし使用中の場合は削除を中止するか、ユーザーに警告する
    // 例: if (isStoreInUse(storeName)) { return { success: false, message: 'この店舗は使用中のため削除できません。'}; }

    // 店舗を削除
    storeSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteStore: 店舗マスターから削除完了');
    
    // ウィッグ在庫シートからも該当店舗のデータを削除
    try {
        const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
        if(inventorySheet) {
            const inventoryData = inventorySheet.getDataRange().getValues();
            const invHeaders = inventoryData[0];
            const invStoreIndex = invHeaders.indexOf('店舗');
            
            if (invStoreIndex !== -1) {
                for (let i = inventoryData.length - 1; i >= 1; i--) {
                    if (inventoryData[i][invStoreIndex] === storeName) {
                        inventorySheet.deleteRow(i + 1);
                        Logger.log('deleteStore: 在庫シートから削除完了');
                        break; 
                    }
                }
            }
        }
    } catch (invError) {
        console.error('ウィッグ在庫シートからの店舗削除エラー（無視して継続）: ' + invError);
         Logger.log('deleteStore: 在庫シートからの削除エラー（無視） - ' + invError.toString());
    }
    
    return { success: true, message: '店舗「' + storeName + '」が削除されました。' }; // メッセージに店舗名追加
  } catch (e) {
    console.error('店舗削除エラー: ' + e);
    Logger.log('deleteStore: エラー - ' + e.toString());
    return { success: false, message: '店舗の削除中にエラーが発生しました: ' + e.toString() };
  }
}

// --- 役職管理 ---
function getRoles() { /* ... (変更なし、ログ追加推奨) ... */ }
function addRole(roleName) { /* ... (変更なし、ログ追加推奨) ... */ }
function deleteRole(roleName) { /* ... (変更なし、ログ追加推奨) ... */ }
// TODO: 役職の編集機能 (updateRole) を追加する場合はここに実装

// --- トレーナー管理 ---
function getAllTrainers() { /* ... (変更なし、ログ追加推奨) ... */ }
function addTrainer(trainerName, storeName) { /* ... (変更なし、ログ追加推奨) ... */ }
function deleteTrainer(trainerName, storeName) { /* ... (変更なし、ログ追加推奨) ... */ }
// TODO: トレーナーの編集機能 (updateTrainer) を追加する場合はここに実装

// --- 技術カテゴリー管理 ---
function getAllTechCategories() { /* ... (変更なし、ログ追加推奨) ... */ }
function addTechCategory(categoryName, roles) { /* ... (変更なし、ログ追加推奨) ... */ }
function deleteTechCategory(categoryName) { /* ... (変更なし、ログ追加推奨) ... */ }
// TODO: 技術カテゴリーの編集機能 (updateTechCategory) を追加する場合はここに実装

// --- 詳細技術項目管理 ---
function getAllTechDetails() { /* ... (変更なし、ログ追加推奨) ... */ }
function addTechDetail(detailName, categoryName, roles) { /* ... (変更なし、ログ追加推奨) ... */ }
function deleteTechDetail(detailName, categoryName) { /* ... (変更なし、ログ追加推奨) ... */ }
// TODO: 詳細技術項目の編集機能 (updateTechDetail) を追加する場合はここに実装

// --- ウィッグ在庫管理 ---
function updateWigStock(store, stockCount) { /* ... (変更なし、ログ追加推奨) ... */ }