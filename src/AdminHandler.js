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
  try {
    // 管理者権限チェック (Utils.js の関数)
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    // 店舗マスターシートを取得
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    
    // ヘッダー行から列インデックスを取得
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名'); // 列名を確認
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません（「店舗名」列が見つかりません）。' };
    }
    
    // 店舗名の配列を作成（ヘッダー行を除く）
    const stores = [];
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][nameIndex]) { // 空の行をスキップ
        stores.push(storeData[i][nameIndex]);
      }
    }
    
    return { success: true, data: stores };
  } catch (e) {
    console.error('店舗一覧取得エラー: ' + e);
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
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    // 入力値チェック
    if (!storeName || typeof storeName !== 'string' || storeName.trim() === '') {
      return { success: false, message: '店舗名を入力してください。' };
    }
    storeName = storeName.trim(); // 前後の空白を除去
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }
    
    // 既存の店舗名と重複がないか確認 (大文字小文字区別なしで比較する場合)
    const existingStores = storeData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingStores.includes(storeName.toLowerCase())) {
      return { success: false, message: 'この店舗名は既に登録されています。' };
    }
    
    // 新しい店舗を追加
    storeSheet.appendRow([storeName]);
    
    // ウィッグ在庫シートにも初期データを追加 (在庫0で)
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
        }
    } catch (invError) {
        console.error('ウィッグ在庫シートへの店舗追加エラー（無視して継続）: ' + invError);
        // 在庫シートへの追加は失敗しても店舗追加自体は成功とする場合
    }
    
    return { success: true, message: '店舗が追加されました。' };
  } catch (e) {
    console.error('店舗追加エラー: ' + e);
    return { success: false, message: '店舗の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗を削除する
 * 
 * @param {string} storeName - 削除する店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteStore(storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!storeName) {
      return { success: false, message: '削除する店舗名を指定してください。' };
    }
    
    const storeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません。' };
    }
    
    // 該当店舗の行を検索 (逆順で検索すると削除時のインデックスずれを防ぎやすい)
    let rowIndexToDelete = -1;
    for (let i = storeData.length - 1; i >= 1; i--) { // ヘッダー除く
      if (storeData[i][nameIndex] === storeName) {
        rowIndexToDelete = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndexToDelete === -1) {
      return { success: false, message: '指定された店舗が見つかりません。' };
    }
    
    // 店舗を削除
    storeSheet.deleteRow(rowIndexToDelete);
    
    // ウィッグ在庫シートからも該当店舗のデータを削除
    try {
        const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
        const inventoryData = inventorySheet.getDataRange().getValues();
        const invHeaders = inventoryData[0];
        const invStoreIndex = invHeaders.indexOf('店舗');
        
        if (invStoreIndex !== -1) {
            for (let i = inventoryData.length - 1; i >= 1; i--) {
                if (inventoryData[i][invStoreIndex] === storeName) {
                    inventorySheet.deleteRow(i + 1);
                    // 複数の同じ店舗名が存在する可能性は低いが一応break
                    break; 
                }
            }
        }
    } catch (invError) {
        console.error('ウィッグ在庫シートからの店舗削除エラー（無視して継続）: ' + invError);
    }
    
    return { success: true, message: '店舗が削除されました。' };
  } catch (e) {
    console.error('店舗削除エラー: ' + e);
    return { success: false, message: '店舗の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職一覧を取得する
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<string>, message?: string }
 */
function getRoles() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名'); // 列名を確認
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません（「役職名」列が見つかりません）。' };
    }
    
    const roles = [];
    for (let i = 1; i < roleData.length; i++) {
      if (roleData[i][nameIndex]) { // 空の行をスキップ
        roles.push(roleData[i][nameIndex]);
      }
    }
    
    return { success: true, data: roles };
  } catch (e) {
    console.error('役職一覧取得エラー: ' + e);
    return { success: false, message: '役職一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職を追加する
 * 
 * @param {string} roleName - 追加する役職名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addRole(roleName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!roleName || typeof roleName !== 'string' || roleName.trim() === '') {
      return { success: false, message: '役職名を入力してください。' };
    }
    roleName = roleName.trim();
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック (大文字小文字区別なし)
    const existingRoles = roleData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingRoles.includes(roleName.toLowerCase())) {
      return { success: false, message: 'この役職名は既に登録されています。' };
    }
    
    // 新しい役職を追加
    roleSheet.appendRow([roleName]);
    
    return { success: true, message: '役職が追加されました。' };
  } catch (e) {
    console.error('役職追加エラー: ' + e);
    return { success: false, message: '役職の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職を削除する
 * 
 * @param {string} roleName - 削除する役職名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteRole(roleName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!roleName) {
      return { success: false, message: '削除する役職名を指定してください。' };
    }
    
    const roleSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません。' };
    }
    
    let rowIndexToDelete = -1;
    for (let i = roleData.length - 1; i >= 1; i--) {
      if (roleData[i][nameIndex] === roleName) {
        rowIndexToDelete = i + 1;
        break;
      }
    }
    
    if (rowIndexToDelete === -1) {
      return { success: false, message: '指定された役職が見つかりません。' };
    }
    
    // 役職を削除
    roleSheet.deleteRow(rowIndexToDelete);
    
    return { success: true, message: '役職が削除されました。' };
  } catch (e) {
    console.error('役職削除エラー: ' + e);
    return { success: false, message: '役職の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 全てのトレーナー一覧を取得する（管理者用）
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, store: string}>, message?: string }
 */
function getAllTrainers() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前'); // 列名確認
    const storeIndex = headers.indexOf('店舗'); // 列名確認
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません（「名前」または「店舗」列が見つかりません）。' };
    }
    
    const trainers = [];
    for (let i = 1; i < trainerData.length; i++) {
      if (trainerData[i][nameIndex] && trainerData[i][storeIndex]) { // 名前と店舗が両方ある行のみ
        trainers.push({
          name: trainerData[i][nameIndex],
          store: trainerData[i][storeIndex]
        });
      }
    }
    
    return { success: true, data: trainers };
  } catch (e) {
    console.error('トレーナー一覧取得エラー: ' + e);
    return { success: false, message: 'トレーナー一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * トレーナーを追加する
 * 
 * @param {string} trainerName - 追加するトレーナー名
 * @param {string} storeName - 所属店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTrainer(trainerName, storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!trainerName || !storeName || typeof trainerName !== 'string' || typeof storeName !== 'string' || trainerName.trim() === '' || storeName.trim() === '') {
      return { success: false, message: 'トレーナー名と店舗名を入力してください。' };
    }
    trainerName = trainerName.trim();
    storeName = storeName.trim();
    
    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック (名前と店舗の組み合わせ)
    for (let i = 1; i < trainerData.length; i++) {
      if (trainerData[i][nameIndex] === trainerName && trainerData[i][storeIndex] === storeName) {
        return { success: false, message: 'このトレーナーと店舗の組み合わせは既に登録されています。' };
      }
    }
    
    // 新しいトレーナーを追加
    trainerSheet.appendRow([trainerName, storeName]);
    
    return { success: true, message: 'トレーナーが追加されました。' };
  } catch (e) {
    console.error('トレーナー追加エラー: ' + e);
    return { success: false, message: 'トレーナーの追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * トレーナーを削除する
 * 
 * @param {string} trainerName - 削除するトレーナー名
 * @param {string} storeName - 所属店舗名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTrainer(trainerName, storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!trainerName || !storeName) {
      return { success: false, message: '削除するトレーナー名と店舗名を指定してください。' };
    }
    
    const trainerSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }
    
    let rowIndexToDelete = -1;
    for (let i = trainerData.length - 1; i >= 1; i--) {
      if (trainerData[i][nameIndex] === trainerName && trainerData[i][storeIndex] === storeName) {
        rowIndexToDelete = i + 1;
        break;
      }
    }
    
    if (rowIndexToDelete === -1) {
      return { success: false, message: '指定されたトレーナーと店舗の組み合わせが見つかりません。' };
    }
    
    // トレーナーを削除
    trainerSheet.deleteRow(rowIndexToDelete);
    
    return { success: true, message: 'トレーナーが削除されました。' };
  } catch (e) {
    console.error('トレーナー削除エラー: ' + e);
    return { success: false, message: 'トレーナーの削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 全ての技術カテゴリー一覧を取得する（管理者用）
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, roles: Array<string>}>, message?: string }
 */
function getAllTechCategories() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const categorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名'); // 列名確認
    const roleIndex = headers.indexOf('対象役職'); // 列名確認
    
    if (nameIndex === -1 || roleIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません（「カテゴリー名」または「対象役職」列が見つかりません）。' };
    }
    
    const categories = [];
    for (let i = 1; i < categoryData.length; i++) {
      if (categoryData[i][nameIndex]) { // カテゴリー名がある行のみ
        const rolesString = categoryData[i][roleIndex] ? categoryData[i][roleIndex].toString() : '';
        const roles = rolesString.split(',').map(role => role.trim()).filter(role => role); // 空を除去
        categories.push({
          name: categoryData[i][nameIndex],
          roles: roles 
        });
      }
    }
    
    return { success: true, data: categories };
  } catch (e) {
    console.error('技術カテゴリー一覧取得エラー: ' + e);
    return { success: false, message: '技術カテゴリー一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 技術カテゴリーを追加する
 * 
 * @param {string} categoryName - 追加するカテゴリー名
 * @param {string} roles - 対象役職（カンマ区切り文字列）
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTechCategory(categoryName, roles) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!categoryName || !roles || typeof categoryName !== 'string' || typeof roles !== 'string' || categoryName.trim() === '' || roles.trim() === '') {
      return { success: false, message: 'カテゴリー名と対象役職を入力してください。' };
    }
    categoryName = categoryName.trim();
    // roles はカンマ区切り文字列として受け取る想定
    
    const categorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    
    if (nameIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック (大文字小文字区別なし)
    const existingCategories = categoryData.slice(1).map(row => row[nameIndex] ? row[nameIndex].toString().toLowerCase() : '');
    if (existingCategories.includes(categoryName.toLowerCase())) {
      return { success: false, message: 'このカテゴリー名は既に登録されています。' };
    }
    
    // 新しいカテゴリーを追加
    categorySheet.appendRow([categoryName, roles.trim()]);
    
    return { success: true, message: '技術カテゴリーが追加されました。' };
  } catch (e) {
    console.error('技術カテゴリー追加エラー: ' + e);
    return { success: false, message: '技術カテゴリーの追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 技術カテゴリーを削除する
 * 
 * @param {string} categoryName - 削除するカテゴリー名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTechCategory(categoryName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!categoryName) {
      return { success: false, message: '削除するカテゴリー名を指定してください。' };
    }
    
    const categorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    
    if (nameIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }
    
    let rowIndexToDelete = -1;
    for (let i = categoryData.length - 1; i >= 1; i--) {
      if (categoryData[i][nameIndex] === categoryName) {
        rowIndexToDelete = i + 1;
        break;
      }
    }
    
    if (rowIndexToDelete === -1) {
      return { success: false, message: '指定されたカテゴリーが見つかりません。' };
    }
    
    // カテゴリーを削除
    categorySheet.deleteRow(rowIndexToDelete);

    // TODO: 関連する詳細技術項目も削除するか、警告を出すか検討
    
    return { success: true, message: '技術カテゴリーが削除されました。' };
  } catch (e) {
    console.error('技術カテゴリー削除エラー: ' + e);
    return { success: false, message: '技術カテゴリーの削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 全ての詳細技術項目一覧を取得する（管理者用）
 * 
 * @return {Object} 結果 { success: boolean, data?: Array<{name: string, category: string, roles: Array<string>}>, message?: string }
 */
function getAllTechDetails() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名'); // 列名確認
    const categoryIndex = headers.indexOf('カテゴリー'); // 列名確認
    const roleIndex = headers.indexOf('対象役職'); // 列名確認
    
    if (nameIndex === -1 || categoryIndex === -1 || roleIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません（必要な列が見つかりません）。' };
    }
    
    const details = [];
    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][nameIndex] && detailData[i][categoryIndex]) { // 項目名とカテゴリーがある行のみ
        const rolesString = detailData[i][roleIndex] ? detailData[i][roleIndex].toString() : '';
        const roles = rolesString.split(',').map(role => role.trim()).filter(role => role);
        details.push({
          name: detailData[i][nameIndex],
          category: detailData[i][categoryIndex],
          roles: roles
        });
      }
    }
    
    return { success: true, data: details };
  } catch (e) {
    console.error('詳細技術項目一覧取得エラー: ' + e);
    return { success: false, message: '詳細技術項目一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 詳細技術項目を追加する
 * 
 * @param {string} detailName - 追加する項目名
 * @param {string} categoryName - 所属するカテゴリー名
 * @param {string} roles - 対象役職（カンマ区切り文字列）
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function addTechDetail(detailName, categoryName, roles) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!detailName || !categoryName || !roles || typeof detailName !== 'string' || typeof categoryName !== 'string' || typeof roles !== 'string' || detailName.trim() === '' || categoryName.trim() === '' || roles.trim() === '') {
      return { success: false, message: '項目名、カテゴリー名、対象役職を入力してください。' };
    }
    detailName = detailName.trim();
    categoryName = categoryName.trim();
    // roles はカンマ区切り文字列として受け取る
    
    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    
    if (nameIndex === -1 || categoryIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }
    
    // 重複チェック (項目名とカテゴリーの組み合わせ)
    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][nameIndex] === detailName && detailData[i][categoryIndex] === categoryName) {
        return { success: false, message: 'この項目名とカテゴリーの組み合わせは既に登録されています。' };
      }
    }
    
    // 新しい詳細項目を追加
    detailSheet.appendRow([detailName, categoryName, roles.trim()]);
    
    return { success: true, message: '詳細技術項目が追加されました。' };
  } catch (e) {
    console.error('詳細技術項目追加エラー: ' + e);
    return { success: false, message: '詳細技術項目の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 詳細技術項目を削除する
 * 
 * @param {string} detailName - 削除する項目名
 * @param {string} categoryName - 所属するカテゴリー名
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function deleteTechDetail(detailName, categoryName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!detailName || !categoryName) {
      return { success: false, message: '削除する項目名とカテゴリー名を指定してください。' };
    }
    
    const detailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    
    if (nameIndex === -1 || categoryIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }
    
    let rowIndexToDelete = -1;
    for (let i = detailData.length - 1; i >= 1; i--) {
      if (detailData[i][nameIndex] === detailName && detailData[i][categoryIndex] === categoryName) {
        rowIndexToDelete = i + 1;
        break;
      }
    }
    
    if (rowIndexToDelete === -1) {
      return { success: false, message: '指定された項目名とカテゴリーの組み合わせが見つかりません。' };
    }
    
    // 詳細項目を削除
    detailSheet.deleteRow(rowIndexToDelete);
    
    return { success: true, message: '詳細技術項目が削除されました。' };
  } catch (e) {
    console.error('詳細技術項目削除エラー: ' + e);
    return { success: false, message: '詳細技術項目の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗ごとのウィッグ在庫数を手動で更新（上書き）する
 * 
 * @param {string} store - 更新対象の店舗名
 * @param {number} stockCount - 設定する在庫数（数値）
 * @return {Object} 結果 { success: boolean, message?: string }
 */
function updateWigStock(store, stockCount) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です。' };
    }
    
    if (!store || typeof store !== 'string' || store.trim() === '') {
      return { success: false, message: '店舗名を指定してください。' };
    }
    store = store.trim();
    
    // stockCount が数値であり、0以上かチェック
    const count = Number(stockCount);
    if (isNaN(count) || count < 0) {
      return { success: false, message: '在庫数は0以上の数値を入力してください。' };
    }
    
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    const headers = inventoryData[0];
    const storeIndex = headers.indexOf('店舗'); // 列名確認
    const stockIndex = headers.indexOf('在庫数'); // 列名確認
    
    if (storeIndex === -1 || stockIndex === -1) {
      return { success: false, message: 'ウィッグ在庫シートの形式が正しくありません（「店舗」または「在庫数」列が見つかりません）。' };
    }
    
    let rowIndexToUpdate = -1;
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][storeIndex] === store) {
        rowIndexToUpdate = i + 1; // シートの行番号は1から
        break;
      }
    }
    
    if (rowIndexToUpdate === -1) {
      // 該当店舗がない場合は新規追加
      inventorySheet.appendRow([store, count]);
      return { success: true, message: '店舗「' + store + '」のウィッグ在庫が新規登録されました。' };
    } else {
      // 既存の在庫数を更新（上書き）
      inventorySheet.getRange(rowIndexToUpdate, stockIndex + 1).setValue(count);
      return { success: true, message: '店舗「' + store + '」のウィッグ在庫が更新されました。' };
    }
  } catch (e) {
    console.error('ウィッグ在庫更新エラー: ' + e);
    return { success: false, message: 'ウィッグ在庫の更新中にエラーが発生しました: ' + e.toString() };
  }
}