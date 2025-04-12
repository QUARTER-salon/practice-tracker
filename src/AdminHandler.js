
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
    if (!storeSheet) {
      Logger.log('getStores: 店舗マスターシートが見つかりません。');
      return { success: false, message: '店舗マスターシートが見つかりません。' };
    }
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');

    if (nameIndex === -1) {
      Logger.log('getStores: 店舗マスターシート形式不正（「店舗名」列なし）');
      return { success: false, message: '店舗マスターシートの形式が正しくありません（「店舗名」列が見つかりません）。' };
    }

    const stores = [];
    // ヘッダー行を除き、最終行までループ
    for (let i = 1; i < storeData.length; i++) {
      // 店舗名が存在し、空文字列でない場合のみ追加
      if (storeData[i][nameIndex] && String(storeData[i][nameIndex]).trim() !== '') {
         stores.push(String(storeData[i][nameIndex]).trim());
       }
    }
    Logger.log('getStores: 取得した店舗数=' + stores.length);

    return { success: true, data: stores };
  } catch (e) {
    console.error('店舗一覧取得エラー: ' + e);
    Logger.log('getStores: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '店舗一覧の取得中にエラーが発生しました: ' + e.message };
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

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const storeSheet = ss.getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) {
        Logger.log('addStore: 店舗マスターシートが見つかりません。');
        return { success: false, message: '店舗マスターシートが見つかりません。' };
    }
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');

    if (nameIndex === -1) {
      Logger.log('addStore: 店舗マスターシート形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }

    // 重複チェック (大文字小文字無視)
    const existingStores = storeData.slice(1).map(row => row[nameIndex] ? String(row[nameIndex]).trim().toLowerCase() : '');
    if (existingStores.includes(storeName.toLowerCase())) {
       Logger.log('addStore: 店舗名重複');
      return { success: false, message: 'この店舗名は既に登録されています。' };
    }

    storeSheet.appendRow([storeName]);
    Logger.log('addStore: 店舗マスターに追加完了');

    // 在庫シートへの追加
    try {
        const inventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
        if(inventorySheet){
            const inventoryData = inventorySheet.getDataRange().getValues();
            const invHeaders = inventoryData[0];
            const invStoreIndex = invHeaders.indexOf('店舗');
            let storeExistsInInventory = false;
            if (invStoreIndex !== -1) {
                 // 在庫シートでの重複チェック
                 const invExistingStores = inventoryData.slice(1).map(row => row[invStoreIndex] ? String(row[invStoreIndex]).trim().toLowerCase() : '');
                 storeExistsInInventory = invExistingStores.includes(storeName.toLowerCase());
            } else {
                Logger.log('addStore: 在庫シートに「店舗」列なし');
            }

            if (!storeExistsInInventory && invStoreIndex !== -1) {
                inventorySheet.appendRow([storeName, 0]); // 在庫0で追加
                Logger.log('addStore: ウィッグ在庫に初期値追加完了');
            } else if (storeExistsInInventory) {
                Logger.log('addStore: 在庫シートには既に店舗が存在');
            }
        } else {
             Logger.log('addStore: 在庫シートなし');
        }
    } catch (invError) {
        Logger.log('addStore: 在庫シートへの追加中にエラー（無視）: ' + invError);
    }

    return { success: true, message: '店舗「' + storeName + '」が追加されました。' };
  } catch (e) {
    console.error('店舗追加エラー: ' + e);
    Logger.log('addStore: エラー - ' + e.toString() + '\n' + e.stack);
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
    if (originalName.toLowerCase() === newName.toLowerCase()) { // 大文字小文字無視で比較
        Logger.log('updateStore: 店舗名に変更なし');
        return { success: true, message: '店舗名に変更はありませんでした。' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const storeSheet = ss.getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) {
        Logger.log('updateStore: 店舗マスターシートが見つかりません。');
        return { success: false, message: '店舗マスターシートが見つかりません。' };
    }
    const storeData = storeSheet.getDataRange().getValues();
    const storeHeaders = storeData[0];
    const storeNameIndex = storeHeaders.indexOf('店舗名');
    if (storeNameIndex === -1) {
      Logger.log('updateStore: 店舗マスター形式不正');
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }

    // 重複チェック と 更新対象行特定
    let originalRowIndex = -1;
    let newNameExists = false;
    for (let i = 1; i < storeData.length; i++) {
       const currentStoreName = storeData[i][storeNameIndex] ? String(storeData[i][storeNameIndex]).trim() : '';
        if (currentStoreName.toLowerCase() === originalName.toLowerCase()) {
            originalRowIndex = i + 1; // 行番号 (1-based)
        }
        if (currentStoreName.toLowerCase() === newName.toLowerCase()) {
            newNameExists = true;
        }
    }

    if (originalRowIndex === -1) {
       Logger.log('updateStore: 更新対象なし');
       return { success: false, message: '更新対象の店舗「' + originalName + '」が見つかりません。' };
    }
    if (newNameExists) {
        Logger.log('updateStore: 新しい店舗名重複');
        return { success: false, message: '新しい店舗名「' + newName + '」は既に存在します。' };
    }

    let updateMessages = [];

    // 1. 店舗マスター更新
    try {
        storeSheet.getRange(originalRowIndex, storeNameIndex + 1).setValue(newName);
        Logger.log('updateStore: 店舗マスターシート更新完了');
        updateMessages.push('店舗マスター');
    } catch(e) {
        Logger.log('updateStore: ★★★ 店舗マスターシート更新エラー ★★★: ' + e);
        // このエラーは致命的なので処理を中断
        return { success: false, message: '店舗マスターの更新中にエラーが発生しました: ' + e.message };
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
                    if (inventoryData[i][invStoreIndex] && String(inventoryData[i][invStoreIndex]).trim().toLowerCase() === originalName.toLowerCase()) {
                        inventorySheet.getRange(i + 1, invStoreIndex + 1).setValue(newName);
                        Logger.log('updateStore: 在庫シート更新完了 (行' + (i+1) + ')');
                        updateMessages.push('在庫');
                        break; // 一致したらループ終了
                    }
                }
            } else { Logger.log('updateStore: 在庫シートに「店舗」列なし'); }
        } else { Logger.log('updateStore: 在庫シートなし'); }
    } catch(e) {
        Logger.log('updateStore: 在庫シート更新エラー（無視）: ' + e);
        updateMessages.push('在庫(エラー)');
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
                for (let i = 1; i < trainerData.length; i++) {
                   if (trainerData[i][trainerStoreIndex] && String(trainerData[i][trainerStoreIndex]).trim().toLowerCase() === originalName.toLowerCase()) {
                       trainerSheet.getRange(i + 1, trainerStoreIndex + 1).setValue(newName);
                       updatedCount++;
                   }
                }
                if (updatedCount > 0) {
                   Logger.log('updateStore: トレーナーマスター更新完了 (' + updatedCount + '件)');
                   updateMessages.push('トレーナー');
                }
             } else { Logger.log('updateStore: トレーナーマスターに「店舗」列なし'); }
        } else { Logger.log('updateStore: トレーナーマスターなし'); }
    } catch(e) {
       Logger.log('updateStore: トレーナーマスター更新エラー（無視）: ' + e);
       updateMessages.push('トレーナー(エラー)');
    }

    // 4. スタッフマスター更新
    try {
       const staffSheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
        if (staffSheet) {
            const staffData = staffSheet.getDataRange().getValues();
            const staffHeaders = staffData[0];
            const staffStoreIndex = staffHeaders.indexOf('店舗'); // ★★★ 列名確認！★★★
             if (staffStoreIndex !== -1) {
                 let updatedCount = 0;
                 for (let i = 1; i < staffData.length; i++) {
                    if (staffData[i][staffStoreIndex] && String(staffData[i][staffStoreIndex]).trim().toLowerCase() === originalName.toLowerCase()) {
                       staffSheet.getRange(i + 1, staffStoreIndex + 1).setValue(newName);
                       updatedCount++;
                   }
                 }
                 if (updatedCount > 0) {
                   Logger.log('updateStore: スタッフマスター更新完了 (' + updatedCount + '件)');
                   updateMessages.push('スタッフ');
                 }
             } else { Logger.log('updateStore: スタッフマスターに「店舗」列なし'); }
        } else { Logger.log('updateStore: スタッフマスターなし'); }
    } catch(e) {
       Logger.log('updateStore: スタッフマスター更新エラー（無視）: ' + e);
       updateMessages.push('スタッフ(エラー)');
    }

    const message = updateMessages.length > 0
        ? `店舗情報が更新されました。\n関連シート: (${updateMessages.join(', ')})`
        : '店舗マスターが更新されました。';
    return { success: true, message: message };
  } catch (e) {
    console.error('店舗更新全体エラー (updateStore): ' + e);
    Logger.log('updateStore: 全体エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '店舗情報の更新中に予期せぬエラーが発生しました: ' + e.message };
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
     storeName = storeName.trim();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const storeSheet = ss.getSheetByName(STORE_MASTER_SHEET_NAME);
    if (!storeSheet) {
        Logger.log('deleteStore: 店舗マスターシートが見つかりません。');
        return { success: false, message: '店舗マスターシートが見つかりません。' };
    }
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    if (nameIndex === -1) {
        Logger.log('deleteStore: 店舗マスターシート形式不正');
       return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }

    let rowIndexToDelete = -1;
    for (let i = storeData.length - 1; i >= 1; i--) { // 後ろから探す方が削除時のインデックスずれが少ない
      if (storeData[i][nameIndex] && String(storeData[i][nameIndex]).trim().toLowerCase() === storeName.toLowerCase()) {
        rowIndexToDelete = i + 1; // 行番号 (1-based)
        break;
      }
    }
    if (rowIndexToDelete === -1) {
       Logger.log('deleteStore: 削除対象の店舗「' + storeName + '」が見つかりません。');
      return { success: false, message: '指定された店舗が見つかりません。' };
    }

    // TODO: 使用中チェックの実装 (トレーナーマスター、スタッフマスターに該当店舗がないか確認)
    // if (isStoreInUse(ss, storeName)) {
    //     return { success: false, message: 'この店舗はトレーナーまたはスタッフに割り当てられているため削除できません。' };
    // }

    storeSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteStore: 店舗マスターから削除完了');

    // 在庫シートから削除
    try {
        const inventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
        if(inventorySheet) {
            const inventoryData = inventorySheet.getDataRange().getValues();
            const invHeaders = inventoryData[0];
            const invStoreIndex = invHeaders.indexOf('店舗');
            if (invStoreIndex !== -1) {
                let invRowToDelete = -1;
                 for (let i = inventoryData.length - 1; i >= 1; i--) {
                     if (inventoryData[i][invStoreIndex] && String(inventoryData[i][invStoreIndex]).trim().toLowerCase() === storeName.toLowerCase()) {
                         invRowToDelete = i + 1;
                         break;
                     }
                 }
                 if (invRowToDelete !== -1) {
                     inventorySheet.deleteRow(invRowToDelete);
                     Logger.log('deleteStore: 在庫シートから削除完了');
                 }
            }
        }
    } catch (invError) {
         Logger.log('deleteStore: 在庫シートからの削除中にエラー（無視）: ' + invError);
    }

    return { success: true, message: '店舗「' + storeName + '」が削除されました。' };
  } catch (e) {
    console.error('店舗削除エラー: ' + e);
    Logger.log('deleteStore: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '店舗の削除中に予期せぬエラーが発生しました: ' + e.message };
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
     if (!roleSheet) {
        Logger.log('getRoles: 役職マスターシートが見つかりません。');
        return { success: false, message: '役職マスターシートが見つかりません。' };
    }
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    if (nameIndex === -1) {
        Logger.log('getRoles: 役職マスターシート形式不正（「役職名」列なし）');
        return { success: false, message: '役職マスターシートの形式が正しくありません（「役職名」列が見つかりません）。' };
     }

    const roles = [];
    for (let i = 1; i < roleData.length; i++) {
      if (roleData[i][nameIndex] && String(roleData[i][nameIndex]).trim() !== '') {
          roles.push(String(roleData[i][nameIndex]).trim());
      }
    }
     Logger.log('getRoles: 取得した役職数=' + roles.length);

    return { success: true, data: roles };
  } catch (e) {
      console.error('役職一覧取得エラー: ' + e);
      Logger.log('getRoles: エラー - ' + e.toString() + '\n' + e.stack);
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
     if (!roleSheet) {
        Logger.log('addRole: 役職マスターシートが見つかりません。');
        return { success: false, message: '役職マスターシートが見つかりません。' };
     }
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    if (nameIndex === -1) {
        Logger.log('addRole: 役職マスターシート形式不正');
        return { success: false, message: '役職マスターシートの形式が正しくありません。' };
    }

    // 重複チェック
    const existingRoles = roleData.slice(1).map(row => row[nameIndex] ? String(row[nameIndex]).trim().toLowerCase() : '');
    if (existingRoles.includes(roleName.toLowerCase())) {
       Logger.log('addRole: 役職名重複');
       return { success: false, message: 'この役職名は既に登録されています。' };
    }

    roleSheet.appendRow([roleName]);
     Logger.log('addRole: 役職マスターに追加完了');

    return { success: true, message: '役職「' + roleName + '」が追加されました。' };
  } catch (e) {
      console.error('役職追加エラー: ' + e);
      Logger.log('addRole: エラー - ' + e.toString() + '\n' + e.stack);
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
    if (!originalName || !newName || typeof originalName !== 'string' || typeof newName !== 'string' || originalName.trim() === '' || newName.trim() === '') {
        Logger.log('updateRole: 引数不正');
        return { success: false, message: '更新前後の役職名が必要です。' };
     }
    originalName = originalName.trim();
    newName = newName.trim();
    if (originalName.toLowerCase() === newName.toLowerCase()) {
         Logger.log('updateRole: 役職名に変更なし');
         return { success: true, message: '役職名に変更はありませんでした。' };
     }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const roleSheet = ss.getSheetByName(ROLE_MASTER_SHEET_NAME);
    if (!roleSheet) {
        Logger.log('updateRole: 役職マスターシートが見つかりません。');
        return { success: false, message: '役職マスターシートが見つかりません。' };
     }
    const roleData = roleSheet.getDataRange().getValues();
    const roleHeaders = roleData[0];
    const roleNameIndex = roleHeaders.indexOf('役職名');
    if (roleNameIndex === -1) {
        Logger.log('updateRole: 役職マスター形式不正');
        return { success: false, message: '役職マスターシートの形式が正しくありません。' };
     }

    // 重複チェック & 更新対象行特定
    let originalRowIndex = -1;
    let newNameExists = false;
    for (let i = 1; i < roleData.length; i++) {
        const currentRoleName = roleData[i][roleNameIndex] ? String(roleData[i][roleNameIndex]).trim() : '';
        if (currentRoleName.toLowerCase() === originalName.toLowerCase()) {
            originalRowIndex = i + 1;
        }
        if (currentRoleName.toLowerCase() === newName.toLowerCase()) {
            newNameExists = true;
        }
     }

    if (originalRowIndex === -1) {
         Logger.log('updateRole: 更新対象なし');
         return { success: false, message: '更新対象の役職「' + originalName + '」が見つかりません。' };
    }
    if (newNameExists) {
        Logger.log('updateRole: 新しい役職名重複');
        return { success: false, message: '新しい役職名「' + newName + '」は既に存在します。' };
    }

    let updateMessages = [];

    // 1. 役職マスター更新
    try {
        roleSheet.getRange(originalRowIndex, roleNameIndex + 1).setValue(newName);
        Logger.log('updateRole: 役職マスター更新完了');
        updateMessages.push('役職マスター');
    } catch(e) {
        Logger.log('updateRole: ★★★ 役職マスター更新エラー ★★★: ' + e);
        return { success: false, message: '役職マスターの更新中にエラーが発生しました: ' + e.message };
    }

    // --- 関連シートの更新 ---
    const sheetsToUpdate = [
        { sheetName: STAFF_MASTER_SHEET_NAME, columnName: 'Role' }, // スタッフマスターの列名確認！
        { sheetName: TECH_CATEGORY_SHEET_NAME, columnName: '対象役職' },
        { sheetName: TECH_DETAIL_SHEET_NAME, columnName: '対象役職' },
    ];

    sheetsToUpdate.forEach(sheetInfo => {
        try {
            const targetSheet = ss.getSheetByName(sheetInfo.sheetName);
            if (targetSheet) {
                const data = targetSheet.getDataRange().getValues();
                const headers = data[0];
                const colIndex = headers.indexOf(sheetInfo.columnName);
                if (colIndex !== -1) {
                    let updatedCount = 0;
                    for (let i = 1; i < data.length; i++) {
                        const cellValue = data[i][colIndex] ? String(data[i][colIndex]).trim() : '';
                        // カテゴリと詳細項目はカンマ区切りなので個別処理が必要
                        if (sheetInfo.sheetName === TECH_CATEGORY_SHEET_NAME || sheetInfo.sheetName === TECH_DETAIL_SHEET_NAME) {
                            const roles = cellValue.split(',').map(r => r.trim());
                            const originalIndex = roles.map(r => r.toLowerCase()).indexOf(originalName.toLowerCase());
                            if (originalIndex !== -1) {
                                roles[originalIndex] = newName; // 該当役職名を更新
                                const newRolesString = roles.join(',');
                                targetSheet.getRange(i + 1, colIndex + 1).setValue(newRolesString);
                                updatedCount++;
                            } else if (cellValue.toLowerCase() === '全て') {
                                // "全て" の場合は何もしない（または仕様に応じて変更）
                            }
                        } else { // スタッフマスターなど、単一の値の場合
                            if (cellValue.toLowerCase() === originalName.toLowerCase()) {
                                targetSheet.getRange(i + 1, colIndex + 1).setValue(newName);
                                updatedCount++;
                            }
                        }
                    }
                    if (updatedCount > 0) {
                        Logger.log(`updateRole: ${sheetInfo.sheetName} 更新完了 (${updatedCount}件)`);
                        updateMessages.push(sheetInfo.sheetName.replace('マスター', '').replace('シート','')); // 短縮名
                    }
                } else {
                    Logger.log(`updateRole: ${sheetInfo.sheetName} に「${sheetInfo.columnName}」列なし`);
                }
            } else {
                 Logger.log(`updateRole: ${sheetInfo.sheetName} なし`);
            }
        } catch (e) {
            Logger.log(`updateRole: ${sheetInfo.sheetName} 更新エラー（無視）: ${e}`);
            updateMessages.push(`${sheetInfo.sheetName.replace('マスター', '').replace('シート','')}(エラー)`);
        }
    });
    // --- 関連シートの更新ここまで ---


    const message = updateMessages.length > 0
        ? `役職情報が更新されました。\n関連シート: (${updateMessages.join(', ')})`
        : '役職マスターが更新されました。';
    return { success: true, message: message };
  } catch (e) {
    console.error('役職更新全体エラー (updateRole): ' + e);
    Logger.log('updateRole: 全体エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '役職情報の更新中に予期せぬエラーが発生しました: ' + e.message };
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
    roleName = roleName.trim();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const roleSheet = ss.getSheetByName(ROLE_MASTER_SHEET_NAME);
    if (!roleSheet) {
        Logger.log('deleteRole: 役職マスターシートが見つかりません。');
        return { success: false, message: '役職マスターシートが見つかりません。' };
    }
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    if (nameIndex === -1) {
        Logger.log('deleteRole: 役職マスターシート形式不正');
        return { success: false, message: '役職マスターシートの形式が正しくありません。' };
    }

    let rowIndexToDelete = -1;
    for (let i = roleData.length - 1; i >= 1; i--) {
        if (roleData[i][nameIndex] && String(roleData[i][nameIndex]).trim().toLowerCase() === roleName.toLowerCase()) {
            rowIndexToDelete = i + 1;
            break;
        }
     }
    if (rowIndexToDelete === -1) {
        Logger.log('deleteRole: 削除対象の役職「' + roleName + '」が見つかりません。');
        return { success: false, message: '指定された役職が見つかりません。' };
     }

    // TODO: 使用中チェック (スタッフマスター、カテゴリー、詳細項目)
    // if (isRoleInUse(ss, roleName)) {
    //     return { success: false, message: 'この役職はスタッフ、カテゴリー、または詳細項目に割り当てられているため削除できません。' };
    // }

    roleSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteRole: 役職マスターから削除完了');

    // TODO: 関連シートの役職をどうするか？ (削除された役職を含む項目をどう扱うか仕様定義が必要)
    // - 関連シートの該当役職を削除する？
    // - 何もしない？（ゴミデータが残る）
    // - アラートを出す？

    return { success: true, message: '役職「' + roleName + '」が削除されました。\n※関連シートのデータは変更されていません。' };
  } catch (e) {
      console.error('役職削除エラー: ' + e);
      Logger.log('deleteRole: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: '役職の削除中にエラーが発生しました: ' + e.message };
   }
}


// ==================================
// --- トレーナー管理 ---
// ==================================
/**
 * 全てのトレーナー情報を取得する
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, store: string}>, message?: string }
 */
function getAllTrainers() {
  Logger.log('getAllTrainers: 開始');
  try {
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }

    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    if (!trainerSheet) {
      Logger.log('getAllTrainers: トレーナーマスターシートが見つかりません。');
      return { success: false, message: 'トレーナーマスターシートが見つかりません。' };
    }

    const trainerData = trainerSheet.getDataRange().getValues();
    if (trainerData.length <= 1) { // ヘッダーのみの場合
        Logger.log('getAllTrainers: データなし');
        return { success: true, data: [] };
    }

    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');

    if (nameIndex === -1 || storeIndex === -1) {
      Logger.log('getAllTrainers: トレーナーマスターシート形式不正 (名前 or 店舗列なし)');
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません（「名前」または「店舗」列が見つかりません）。' };
    }

    const trainers = [];
    for (let i = 1; i < trainerData.length; i++) {
      const name = trainerData[i][nameIndex] ? String(trainerData[i][nameIndex]).trim() : '';
      const store = trainerData[i][storeIndex] ? String(trainerData[i][storeIndex]).trim() : '';
      if (name && store) { // 名前と店舗の両方がある場合のみ
        trainers.push({ name: name, store: store });
      }
    }
    Logger.log('getAllTrainers: 取得したトレーナー数=' + trainers.length);

    return { success: true, data: trainers };
  } catch (e) {
    console.error('トレーナー一覧取得エラー: ' + e);
    Logger.log('getAllTrainers: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: 'トレーナー一覧の取得中にエラーが発生しました: ' + e.message };
  }
}

/**
 * トレーナーを追加する
 * @param {string} trainerName - 追加するトレーナー名
 * @param {string} storeName - 所属店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTrainer(trainerName, storeName) {
  Logger.log('addTrainer: 開始 - name=' + trainerName + ', store=' + storeName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!trainerName || !storeName || typeof trainerName !== 'string' || typeof storeName !== 'string' || trainerName.trim() === '' || storeName.trim() === '') {
        return { success: false, message: 'トレーナー名と所属店舗を入力してください。' };
    }
    trainerName = trainerName.trim();
    storeName = storeName.trim();

    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    if (!trainerSheet) {
        Logger.log('addTrainer: トレーナーマスターシートが見つかりません。');
        return { success: false, message: 'トレーナーマスターシートが見つかりません。' };
    }
    const trainerData = trainerSheet.getDataRange().getValues();
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    if (nameIndex === -1 || storeIndex === -1) {
        Logger.log('addTrainer: トレーナーマスターシート形式不正');
        return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }

    // 重複チェック (名前と店舗の組み合わせ)
    let exists = false;
    for(let i = 1; i < trainerData.length; i++){
        const existingName = trainerData[i][nameIndex] ? String(trainerData[i][nameIndex]).trim().toLowerCase() : '';
        const existingStore = trainerData[i][storeIndex] ? String(trainerData[i][storeIndex]).trim().toLowerCase() : '';
        if (existingName === trainerName.toLowerCase() && existingStore === storeName.toLowerCase()) {
            exists = true;
            break;
        }
    }
    if (exists) {
        Logger.log('addTrainer: トレーナー重複');
        return { success: false, message: 'このトレーナー（名前と店舗の組み合わせ）は既に登録されています。' };
    }

    trainerSheet.appendRow([trainerName, storeName]);
    Logger.log('addTrainer: トレーナーマスターに追加完了');

    return { success: true, message: 'トレーナー「' + trainerName + ' (' + storeName + ')」が追加されました。' };
  } catch (e) {
      console.error('トレーナー追加エラー: ' + e);
      Logger.log('addTrainer: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: 'トレーナーの追加中にエラーが発生しました: ' + e.message };
   }
}

/**
 * トレーナーを削除する
 * @param {string} trainerName - 削除するトレーナー名
 * @param {string} storeName - 所属店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTrainer(trainerName, storeName) {
   Logger.log('deleteTrainer: 開始 - name=' + trainerName + ', store=' + storeName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!trainerName || !storeName) { return { success: false, message: '削除するトレーナー名と店舗を指定してください。' }; }
    trainerName = trainerName.trim();
    storeName = storeName.trim();

    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    if (!trainerSheet) {
        Logger.log('deleteTrainer: トレーナーマスターシートが見つかりません。');
        return { success: false, message: 'トレーナーマスターシートが見つかりません。' };
    }
    const trainerData = trainerSheet.getDataRange().getValues();
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    if (nameIndex === -1 || storeIndex === -1) {
        Logger.log('deleteTrainer: トレーナーマスターシート形式不正');
        return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }

    let rowIndexToDelete = -1;
    for (let i = trainerData.length - 1; i >= 1; i--) {
        const existingName = trainerData[i][nameIndex] ? String(trainerData[i][nameIndex]).trim().toLowerCase() : '';
        const existingStore = trainerData[i][storeIndex] ? String(trainerData[i][storeIndex]).trim().toLowerCase() : '';
        if (existingName === trainerName.toLowerCase() && existingStore === storeName.toLowerCase()) {
            rowIndexToDelete = i + 1;
            break;
        }
     }
    if (rowIndexToDelete === -1) {
        Logger.log('deleteTrainer: 削除対象のトレーナーが見つかりません。');
        return { success: false, message: '指定されたトレーナーが見つかりません。' };
     }

    trainerSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteTrainer: トレーナーマスターから削除完了');

    return { success: true, message: 'トレーナー「' + trainerName + ' (' + storeName + ')」が削除されました。' };
  } catch (e) {
      console.error('トレーナー削除エラー: ' + e);
      Logger.log('deleteTrainer: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: 'トレーナーの削除中にエラーが発生しました: ' + e.message };
   }
}
// TODO: updateTrainer

// ==================================
// --- 技術カテゴリー管理 ---
// ==================================
/**
 * 全ての技術カテゴリー情報を取得する
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, roles: string}>, message?: string }
 */
function getAllTechCategories() {
  Logger.log('getAllTechCategories: 開始');
  try {
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }

    const categorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    if (!categorySheet) {
      Logger.log('getAllTechCategories: 技術カテゴリーマスターシートが見つかりません。');
      return { success: false, message: '技術カテゴリーマスターシートが見つかりません。' };
    }

    const categoryData = categorySheet.getDataRange().getValues();
     if (categoryData.length <= 1) {
        Logger.log('getAllTechCategories: データなし');
        return { success: true, data: [] };
    }

    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const rolesIndex = headers.indexOf('対象役職');

    if (nameIndex === -1 || rolesIndex === -1) {
      Logger.log('getAllTechCategories: 技術カテゴリーマスターシート形式不正 (カテゴリー名 or 対象役職列なし)');
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません（「カテゴリー名」または「対象役職」列が見つかりません）。' };
    }

    const categories = [];
    for (let i = 1; i < categoryData.length; i++) {
      const name = categoryData[i][nameIndex] ? String(categoryData[i][nameIndex]).trim() : '';
      const roles = categoryData[i][rolesIndex] ? String(categoryData[i][rolesIndex]).trim() : ''; // カンマ区切り文字列 or "全て"
      if (name) { // カテゴリー名があれば追加
        categories.push({ name: name, roles: roles });
      }
    }
    Logger.log('getAllTechCategories: 取得したカテゴリー数=' + categories.length);

    return { success: true, data: categories };
  } catch (e) {
    console.error('技術カテゴリー一覧取得エラー: ' + e);
    Logger.log('getAllTechCategories: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '技術カテゴリー一覧の取得中にエラーが発生しました: ' + e.message };
  }
}

/**
 * 技術カテゴリーを追加する
 * @param {string} categoryName - 追加するカテゴリー名
 * @param {string} rolesString - 対象役職 (カンマ区切り文字列 or "全て")
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTechCategory(categoryName, rolesString) {
   Logger.log('addTechCategory: 開始 - name=' + categoryName + ', roles=' + rolesString);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
        return { success: false, message: 'カテゴリー名を入力してください。' };
    }
     if (!rolesString || typeof rolesString !== 'string' || rolesString.trim() === '') {
        return { success: false, message: '対象役職を選択してください。' };
    }
    categoryName = categoryName.trim();
    rolesString = rolesString.trim();

    const categorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    if (!categorySheet) {
        Logger.log('addTechCategory: 技術カテゴリーマスターシートが見つかりません。');
        return { success: false, message: '技術カテゴリーマスターシートが見つかりません。' };
    }
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    if (nameIndex === -1) {
        Logger.log('addTechCategory: 技術カテゴリーマスターシート形式不正');
        return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }

    // 重複チェック
    const existingCategories = categoryData.slice(1).map(row => row[nameIndex] ? String(row[nameIndex]).trim().toLowerCase() : '');
    if (existingCategories.includes(categoryName.toLowerCase())) {
       Logger.log('addTechCategory: カテゴリー名重複');
       return { success: false, message: 'このカテゴリー名は既に登録されています。' };
    }

    categorySheet.appendRow([categoryName, rolesString]);
    Logger.log('addTechCategory: 技術カテゴリーマスターに追加完了');

    return { success: true, message: '技術カテゴリー「' + categoryName + '」が追加されました。' };
  } catch (e) {
      console.error('技術カテゴリー追加エラー: ' + e);
      Logger.log('addTechCategory: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: '技術カテゴリーの追加中にエラーが発生しました: ' + e.message };
   }
}

/**
 * 技術カテゴリーを更新する
 * @param {string} originalName - 更新前のカテゴリー名
 * @param {string} newName - 更新後の新しいカテゴリー名
 * @param {string} newRolesString - 更新後の対象役職 (カンマ区切り文字列 or "全て")
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateTechCategory(originalName, newName, newRolesString) {
  Logger.log(`updateTechCategory: 開始 - 元:[${originalName}], 新:[${newName}, ${newRolesString}]`);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!originalName || !newName || !newRolesString ||
        typeof originalName !== 'string' || typeof newName !== 'string' || typeof newRolesString !== 'string' ||
        originalName.trim() === '' || newName.trim() === '' || newRolesString.trim() === '') {
        Logger.log('updateTechCategory: 引数不正');
        return { success: false, message: '更新前後のカテゴリー名と対象役職が必要です。' };
    }
    originalName = originalName.trim();
    newName = newName.trim();
    newRolesString = newRolesString.trim();

    // 名前と役職が両方とも変更ない場合のみスキップ（要元の役職情報取得）
    // if (originalName.toLowerCase() === newName.toLowerCase() && originalRolesString === newRolesString) {
    //     Logger.log('updateTechCategory: 情報に変更なし');
    //     return { success: true, message: 'カテゴリー情報に変更はありませんでした。' };
    // }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const categorySheet = ss.getSheetByName(TECH_CATEGORY_SHEET_NAME);
    if (!categorySheet) {
      Logger.log('updateTechCategory: カテゴリーマスターシートが見つかりません。');
      return { success: false, message: '技術カテゴリーマスターシートが見つかりません。' };
    }
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const rolesIndex = headers.indexOf('対象役職');
    if (nameIndex === -1 || rolesIndex === -1) {
      Logger.log('updateTechCategory: カテゴリーマスター形式不正');
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }

    // 更新対象行特定 & 新しい名前の重複チェック
    let originalRowIndex = -1;
    let newNameExists = false;
    let originalRolesString = ''; // 元の役職文字列を保持
    for (let i = 1; i < categoryData.length; i++) {
      const currentName = categoryData[i][nameIndex] ? String(categoryData[i][nameIndex]).trim() : '';
      if (currentName.toLowerCase() === originalName.toLowerCase()) {
        originalRowIndex = i + 1;
        originalRolesString = categoryData[i][rolesIndex] ? String(categoryData[i][rolesIndex]).trim() : ''; // 元の役職を取得
      }
      if (currentName.toLowerCase() === newName.toLowerCase() && (i + 1) !== originalRowIndex) {
          newNameExists = true;
      }
    }

    if (originalRowIndex === -1) {
      Logger.log('updateTechCategory: 更新対象なし');
      return { success: false, message: `更新対象のカテゴリー「${originalName}」が見つかりません。` };
    }
    if (newNameExists) {
      Logger.log('updateTechCategory: 新しいカテゴリー名重複');
      return { success: false, message: `新しいカテゴリー名「${newName}」は既に存在します。` };
    }
    // 変更がないかチェック
    if (originalName.toLowerCase() === newName.toLowerCase() && originalRolesString === newRolesString) {
        Logger.log('updateTechCategory: 情報に変更なし');
        return { success: true, message: 'カテゴリー情報に変更はありませんでした。' };
    }


    let updateMessages = [];

    // 1. カテゴリーマスター更新
    try {
      categorySheet.getRange(originalRowIndex, nameIndex + 1).setValue(newName);
      categorySheet.getRange(originalRowIndex, rolesIndex + 1).setValue(newRolesString);
      Logger.log('updateTechCategory: カテゴリーマスター更新完了');
      updateMessages.push('カテゴリーマスター');
    } catch (e) {
      Logger.log('updateTechCategory: ★★★ カテゴリーマスター更新エラー ★★★: ' + e);
      return { success: false, message: 'カテゴリーマスターの更新中にエラーが発生しました: ' + e.message };
    }

    // 2. 詳細技術項目マスターのカテゴリー名を更新 (名前が変更された場合のみ)
    if (originalName.toLowerCase() !== newName.toLowerCase()) {
        try {
            const detailSheet = ss.getSheetByName(TECH_DETAIL_SHEET_NAME);
            if (detailSheet) {
                const detailData = detailSheet.getDataRange().getValues();
                const detailHeaders = detailData[0];
                const detailCategoryIndex = detailHeaders.indexOf('カテゴリー');
                if (detailCategoryIndex !== -1) {
                    let updatedCount = 0;
                    for (let i = 1; i < detailData.length; i++) {
                        if (detailData[i][detailCategoryIndex] && String(detailData[i][detailCategoryIndex]).trim().toLowerCase() === originalName.toLowerCase()) {
                            detailSheet.getRange(i + 1, detailCategoryIndex + 1).setValue(newName);
                            updatedCount++;
                        }
                    }
                    if (updatedCount > 0) {
                        Logger.log(`updateTechCategory: 詳細技術項目マスターのカテゴリー更新完了 (${updatedCount}件)`);
                        updateMessages.push('詳細技術項目');
                    }
                } else { Logger.log('updateTechCategory: 詳細技術項目マスターに「カテゴリー」列なし'); }
            } else { Logger.log('updateTechCategory: 詳細技術項目マスターなし'); }
        } catch (e) {
            Logger.log(`updateTechCategory: 詳細技術項目マスター更新エラー（無視）: ${e}`);
            updateMessages.push('詳細技術項目(エラー)');
        }
    } else {
         Logger.log('updateTechCategory: カテゴリー名に変更がないため、詳細技術項目マスターの更新はスキップ');
    }

    const message = updateMessages.length > 0
        ? `技術カテゴリー情報が更新されました。\n関連シート: (${updateMessages.join(', ')})`
        : '技術カテゴリー情報が更新されました。'; // 基本的にマスターは更新されるはず
    return { success: true, message: message };

  } catch (e) {
    console.error('技術カテゴリー更新全体エラー (updateTechCategory): ' + e);
    Logger.log('updateTechCategory: 全体エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '技術カテゴリー情報の更新中に予期せぬエラーが発生しました: ' + e.message };
  }
}


/**
 * 技術カテゴリーを削除する
 * @param {string} categoryName - 削除するカテゴリー名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTechCategory(categoryName) {
   Logger.log('deleteTechCategory: 開始 - name=' + categoryName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!categoryName) { return { success: false, message: '削除するカテゴリー名を指定してください。' }; }
    categoryName = categoryName.trim();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const categorySheet = ss.getSheetByName(TECH_CATEGORY_SHEET_NAME);
     if (!categorySheet) {
        Logger.log('deleteTechCategory: 技術カテゴリーマスターシートが見つかりません。');
        return { success: false, message: '技術カテゴリーマスターシートが見つかりません。' };
    }
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    if (nameIndex === -1) {
         Logger.log('deleteTechCategory: 技術カテゴリーマスターシート形式不正');
        return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }

    let rowIndexToDelete = -1;
    for (let i = categoryData.length - 1; i >= 1; i--) {
        if (categoryData[i][nameIndex] && String(categoryData[i][nameIndex]).trim().toLowerCase() === categoryName.toLowerCase()) {
            rowIndexToDelete = i + 1;
            break;
        }
     }
    if (rowIndexToDelete === -1) {
        Logger.log('deleteTechCategory: 削除対象のカテゴリーが見つかりません。');
        return { success: false, message: '指定された技術カテゴリーが見つかりません。' };
     }

    // TODO: 使用中チェック (詳細技術項目)
    // if (isCategoryInUse(ss, categoryName)) {
    //    return { success: false, message: 'このカテゴリーは詳細技術項目で使用されているため削除できません。' };
    // }


    categorySheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteTechCategory: 技術カテゴリーマスターから削除完了');

    // TODO: 関連する詳細技術項目をどうするか？ (削除 or カテゴリを空にする or 警告)

    return { success: true, message: '技術カテゴリー「' + categoryName + '」が削除されました。\n※関連する詳細技術項目は削除されません。' }; // メッセージ変更
  } catch (e) {
      console.error('技術カテゴリー削除エラー: ' + e);
      Logger.log('deleteTechCategory: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: '技術カテゴリーの削除中にエラーが発生しました: ' + e.message };
   }
}


// ==================================
// --- 詳細技術項目管理 ---
// ==================================
/**
 * 全ての詳細技術項目情報を取得する
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, category: string, roles: string}>, message?: string }
 */
function getAllTechDetails() {
  Logger.log('getAllTechDetails: 開始');
  try {
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }

    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    if (!detailSheet) {
      Logger.log('getAllTechDetails: 詳細技術項目マスターシートが見つかりません。');
      return { success: false, message: '詳細技術項目マスターシートが見つかりません。' };
    }

    const detailData = detailSheet.getDataRange().getValues();
     if (detailData.length <= 1) {
        Logger.log('getAllTechDetails: データなし');
        return { success: true, data: [] };
    }

    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const rolesIndex = headers.indexOf('対象役職');

    if (nameIndex === -1 || categoryIndex === -1 || rolesIndex === -1) {
      Logger.log('getAllTechDetails: 詳細技術項目マスターシート形式不正 (項目名 or カテゴリー or 対象役職列なし)');
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません（必要な列が見つかりません）。' };
    }

    const details = [];
    for (let i = 1; i < detailData.length; i++) {
      const name = detailData[i][nameIndex] ? String(detailData[i][nameIndex]).trim() : '';
      const category = detailData[i][categoryIndex] ? String(detailData[i][categoryIndex]).trim() : '';
      const roles = detailData[i][rolesIndex] ? String(detailData[i][rolesIndex]).trim() : '';
      if (name && category) { // 項目名とカテゴリーの両方がある場合のみ
        details.push({ name: name, category: category, roles: roles });
      }
    }
    Logger.log('getAllTechDetails: 取得した詳細項目数=' + details.length);

    return { success: true, data: details };
  } catch (e) {
    console.error('詳細技術項目一覧取得エラー: ' + e);
    Logger.log('getAllTechDetails: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '詳細技術項目一覧の取得中にエラーが発生しました: ' + e.message };
  }
}

/**
 * 詳細技術項目を追加する
 * @param {string} detailName - 追加する項目名
 * @param {string} categoryName - 関連するカテゴリー名
 * @param {string} rolesString - 対象役職 (カンマ区切り文字列 or "全て")
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTechDetail(detailName, categoryName, rolesString) {
  Logger.log('addTechDetail: 開始 - name=' + detailName + ', category=' + categoryName + ', roles=' + rolesString);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!detailName || typeof detailName !== 'string' || detailName.trim() === '') {
        return { success: false, message: '項目名を入力してください。' };
    }
    if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
        return { success: false, message: 'カテゴリーを選択してください。' };
    }
    if (!rolesString || typeof rolesString !== 'string' || rolesString.trim() === '') {
        return { success: false, message: '対象役職を選択してください。' };
    }
    detailName = detailName.trim();
    categoryName = categoryName.trim();
    rolesString = rolesString.trim();

    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    if (!detailSheet) {
        Logger.log('addTechDetail: 詳細技術項目マスターシートが見つかりません。');
        return { success: false, message: '詳細技術項目マスターシートが見つかりません。' };
    }
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    if (nameIndex === -1 || categoryIndex === -1) {
        Logger.log('addTechDetail: 詳細技術項目マスターシート形式不正');
        return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }

    // 重複チェック (項目名とカテゴリーの組み合わせ)
    let exists = false;
    for(let i = 1; i < detailData.length; i++){
        const existingName = detailData[i][nameIndex] ? String(detailData[i][nameIndex]).trim().toLowerCase() : '';
        const existingCategory = detailData[i][categoryIndex] ? String(detailData[i][categoryIndex]).trim().toLowerCase() : '';
        if (existingName === detailName.toLowerCase() && existingCategory === categoryName.toLowerCase()) {
            exists = true;
            break;
        }
    }
    if (exists) {
        Logger.log('addTechDetail: 詳細項目重複');
        return { success: false, message: 'この詳細技術項目（項目名とカテゴリーの組み合わせ）は既に登録されています。' };
    }

    detailSheet.appendRow([detailName, categoryName, rolesString]);
    Logger.log('addTechDetail: 詳細技術項目マスターに追加完了');

    return { success: true, message: '詳細技術項目「' + detailName + '」が追加されました。' };
  } catch (e) {
      console.error('詳細技術項目追加エラー: ' + e);
      Logger.log('addTechDetail: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: '詳細技術項目の追加中にエラーが発生しました: ' + e.message };
   }
}

/**
 * 詳細技術項目を更新する
 * @param {string} originalName - 更新前の項目名
 * @param {string} originalCategory - 更新前のカテゴリー名
 * @param {string} newName - 更新後の新しい項目名
 * @param {string} newCategory - 更新後の新しいカテゴリー名
 * @param {string} newRolesString - 更新後の対象役職
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateTechDetail(originalName, originalCategory, newName, newCategory, newRolesString) {
  Logger.log(`updateTechDetail: 開始 - 元:[${originalName}, ${originalCategory}], 新:[${newName}, ${newCategory}, ${newRolesString}]`);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!originalName || !originalCategory || !newName || !newCategory || !newRolesString ||
        typeof originalName !== 'string' || typeof originalCategory !== 'string' ||
        typeof newName !== 'string' || typeof newCategory !== 'string' || typeof newRolesString !== 'string' ||
        originalName.trim() === '' || originalCategory.trim() === '' ||
        newName.trim() === '' || newCategory.trim() === '' || newRolesString.trim() === '') {
        Logger.log('updateTechDetail: 引数不正');
        return { success: false, message: '更新前後の項目名、カテゴリー、対象役職が必要です。' };
    }
    originalName = originalName.trim();
    originalCategory = originalCategory.trim();
    newName = newName.trim();
    newCategory = newCategory.trim();
    newRolesString = newRolesString.trim();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const detailSheet = ss.getSheetByName(TECH_DETAIL_SHEET_NAME);
    if (!detailSheet) {
        Logger.log('updateTechDetail: 詳細技術項目マスターシートが見つかりません。');
        return { success: false, message: '詳細技術項目マスターシートが見つかりません。' };
    }
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const rolesIndex = headers.indexOf('対象役職');
    if (nameIndex === -1 || categoryIndex === -1 || rolesIndex === -1) {
        Logger.log('updateTechDetail: 詳細技術項目マスターシート形式不正');
        return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }

    // 更新対象行特定 & 新しい組み合わせの重複チェック & 元の役職取得
    let originalRowIndex = -1;
    let newCombinationExists = false;
    let originalRolesString = ''; // 元の役職を保持
    for (let i = 1; i < detailData.length; i++) {
        const currentName = detailData[i][nameIndex] ? String(detailData[i][nameIndex]).trim() : '';
        const currentCategory = detailData[i][categoryIndex] ? String(detailData[i][categoryIndex]).trim() : '';

        if (currentName.toLowerCase() === originalName.toLowerCase() && currentCategory.toLowerCase() === originalCategory.toLowerCase()) {
            originalRowIndex = i + 1;
            originalRolesString = detailData[i][rolesIndex] ? String(detailData[i][rolesIndex]).trim() : ''; // 元の役職を取得
        }
        if (currentName.toLowerCase() === newName.toLowerCase() && currentCategory.toLowerCase() === newCategory.toLowerCase() && (i + 1) !== originalRowIndex) {
            newCombinationExists = true;
        }
    }

    if (originalRowIndex === -1) {
        Logger.log('updateTechDetail: 更新対象なし');
        return { success: false, message: `更新対象の詳細技術項目「${originalName} (${originalCategory})」が見つかりません。` };
    }
    if (newCombinationExists) {
        Logger.log('updateTechDetail: 新しい組み合わせ重複');
        return { success: false, message: `更新後の詳細技術項目「${newName} (${newCategory})」は既に存在します。` };
    }
    // 変更がないかチェック
    if (originalName.toLowerCase() === newName.toLowerCase() &&
        originalCategory.toLowerCase() === newCategory.toLowerCase() &&
        originalRolesString === newRolesString) {
        Logger.log('updateTechDetail: 情報に変更なし');
        return { success: true, message: '詳細技術項目情報に変更はありませんでした。' };
    }


    // 1. 詳細技術項目マスター更新
    try {
        detailSheet.getRange(originalRowIndex, nameIndex + 1).setValue(newName);
        detailSheet.getRange(originalRowIndex, categoryIndex + 1).setValue(newCategory);
        detailSheet.getRange(originalRowIndex, rolesIndex + 1).setValue(newRolesString);
        Logger.log('updateTechDetail: 詳細技術項目マスター更新完了');
    } catch (e) {
        Logger.log('updateTechDetail: ★★★ 詳細技術項目マスター更新エラー ★★★: ' + e);
        return { success: false, message: '詳細技術項目マスターの更新中にエラーが発生しました: ' + e.message };
    }

    // TODO: 練習記録シートの詳細技術項目名を更新するかどうか？ -> 今回は見送り
    // 現状ではマスターデータのみ更新

    return { success: true, message: `詳細技術項目が「${newName} (${newCategory})」に更新されました。` };

  } catch (e) {
    console.error('詳細技術項目更新全体エラー (updateTechDetail): ' + e);
    Logger.log('updateTechDetail: 全体エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '詳細技術項目情報の更新中に予期せぬエラーが発生しました: ' + e.message };
  }
}


/**
 * 詳細技術項目を削除する
 * @param {string} detailName - 削除する項目名
 * @param {string} categoryName - 関連するカテゴリー名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTechDetail(detailName, categoryName) {
  Logger.log('deleteTechDetail: 開始 - name=' + detailName + ', category=' + categoryName);
  try {
    if (!checkAdminAccess()) { return { success: false, message: '管理者権限が必要です。' }; }
    if (!detailName || !categoryName) { return { success: false, message: '削除する項目名とカテゴリーを指定してください。' }; }
    detailName = detailName.trim();
    categoryName = categoryName.trim();

    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    if (!detailSheet) {
        Logger.log('deleteTechDetail: 詳細技術項目マスターシートが見つかりません。');
        return { success: false, message: '詳細技術項目マスターシートが見つかりません。' };
    }
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
     if (nameIndex === -1 || categoryIndex === -1) {
        Logger.log('deleteTechDetail: 詳細技術項目マスターシート形式不正');
        return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }

    let rowIndexToDelete = -1;
    for (let i = detailData.length - 1; i >= 1; i--) {
        const existingName = detailData[i][nameIndex] ? String(detailData[i][nameIndex]).trim().toLowerCase() : '';
        const existingCategory = detailData[i][categoryIndex] ? String(detailData[i][categoryIndex]).trim().toLowerCase() : '';
        if (existingName === detailName.toLowerCase() && existingCategory === categoryName.toLowerCase()) {
            rowIndexToDelete = i + 1;
            break;
        }
     }
    if (rowIndexToDelete === -1) {
        Logger.log('deleteTechDetail: 削除対象の詳細項目が見つかりません。');
        return { success: false, message: '指定された詳細技術項目が見つかりません。' };
     }

    detailSheet.deleteRow(rowIndexToDelete);
    Logger.log('deleteTechDetail: 詳細技術項目マスターから削除完了');

    return { success: true, message: '詳細技術項目「' + detailName + '」が削除されました。' };
  } catch (e) {
      console.error('詳細技術項目削除エラー: ' + e);
      Logger.log('deleteTechDetail: エラー - ' + e.toString() + '\n' + e.stack);
      return { success: false, message: '詳細技術項目の削除中にエラーが発生しました: ' + e.message };
   }
}


// ==================================
// --- ウィッグ在庫管理 ---
// ==================================

/**
 * 店舗のウィッグ在庫数を更新する (DataAccess.jsにも同名関数があるため注意)
 * @param {string} store - 店舗名
 * @param {number} stockCount - 新しい在庫数 (0以上の整数)
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateWigStock(store, stockCount) {
  Logger.log('updateWigStock (Admin): 開始 - store=' + store + ', stockCount=' + stockCount);
  try {
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    if (!store || typeof store !== 'string' || store.trim() === '') {
      return { success: false, message: '店舗を選択してください。' };
    }
    if (stockCount === null || stockCount === undefined || isNaN(Number(stockCount)) || Number(stockCount) < 0 || !Number.isInteger(Number(stockCount))) {
      // 在庫数は0以上の整数であるべき
      return { success: false, message: '在庫数には0以上の整数を入力してください。' };
    }
    store = store.trim();
    const stockCountNumber = Number(stockCount);

    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    if (!inventorySheet) {
        Logger.log('updateWigStock: 在庫シートが見つかりません。');
        return { success: false, message: 'ウィッグ在庫シートが見つかりません。' };
    }
    const inventoryData = inventorySheet.getDataRange().getValues();
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗');
    const stockIndex = headers.indexOf('在庫数');

    if (storeIndex === -1 || stockIndex === -1) {
        Logger.log('updateWigStock: 在庫シート形式不正');
      return { success: false, message: 'ウィッグ在庫シートの形式が正しくありません。' };
    }

    let rowIndexToUpdate = -1;
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][storeIndex] && String(inventoryData[i][storeIndex]).trim().toLowerCase() === store.toLowerCase()) {
        rowIndexToUpdate = i + 1; // 行番号 (1-based)
        break;
      }
    }

    if (rowIndexToUpdate !== -1) {
      // 既存店舗の在庫数を更新
      inventorySheet.getRange(rowIndexToUpdate, stockIndex + 1).setValue(stockCountNumber);
      Logger.log('updateWigStock: 店舗「' + store + '」の在庫を ' + stockCountNumber + ' に更新しました。');
      return { success: true, message: '店舗「' + store + '」の在庫数が ' + stockCountNumber + ' に更新されました。' };
    } else {
      // 新規店舗として追加（棚卸し等で初めて追加する場合）
      inventorySheet.appendRow([store, stockCountNumber]);
      Logger.log('updateWigStock: 店舗「' + store + '」を在庫 ' + stockCountNumber + ' で新規追加しました。');
      return { success: true, message: '店舗「' + store + '」が在庫数 ' + stockCountNumber + ' で追加されました。' };
    }

  } catch (e) {
    console.error('在庫更新エラー (updateWigStock): ' + e);
    Logger.log('updateWigStock: エラー - ' + e.toString() + '\n' + e.stack);
    return { success: false, message: '在庫数の更新中にエラーが発生しました: ' + e.message };
  }
}


// --- ヘルパー関数 (使用中チェックなど、必要であれば追加) ---
/*
function isStoreInUse(ss, storeName) {
    // トレーナーマスターとスタッフマスターで店舗が使用されているかチェック
    // ... 実装 ...
    return false; // 仮
}

function isRoleInUse(ss, roleName) {
    // スタッフマスター、カテゴリーマスター、詳細項目マスターで役職が使用されているかチェック
    // ... 実装 ...
    return false; // 仮
}

function isCategoryInUse(ss, categoryName) {
    // 詳細技術項目マスターでカテゴリーが使用されているかチェック
    // ... 実装 ...
    return false; // 仮
}
*/

