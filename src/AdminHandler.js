/**
 * 美容師練習管理Webアプリケーション
 * 管理者機能用のGASファイル
 * 
 * このスクリプトは管理者向け機能を提供します。
 * 各種マスターデータの管理、在庫管理などを行います。
 */

/**
 * 店舗一覧を取得する
 * 
 * @return {Object} 店舗一覧
 */
function getStores() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // 店舗マスターシートからデータを取得
    const storeSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません' };
    }
    
    // 店舗名の配列を作成
    const stores = [];
    for (let i = 1; i < storeData.length; i++) {
      stores.push(storeData[i][nameIndex]);
    }
    
    return {
      success: true,
      data: stores
    };
  } catch (e) {
    console.error('店舗一覧取得エラー: ' + e);
    return { success: false, message: '店舗一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗を追加する
 * 
 * @param {string} storeName - 店舗名
 * @return {Object} 処理結果
 */
function addStore(storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!storeName) {
      return { success: false, message: '店舗名を入力してください' };
    }
    
    // 店舗マスターシートからデータを取得
    const storeSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません' };
    }
    
    // 既存の店舗名と重複がないか確認
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][nameIndex] === storeName) {
        return { success: false, message: 'この店舗名は既に登録されています' };
      }
    }
    
    // 新しい店舗を追加
    storeSheet.appendRow([storeName]);
    
    // ウィッグ在庫シートにも初期データを追加
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    inventorySheet.appendRow([storeName, 0]);
    
    return {
      success: true,
      message: '店舗が追加されました'
    };
  } catch (e) {
    console.error('店舗追加エラー: ' + e);
    return { success: false, message: '店舗の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 店舗を削除する
 * 
 * @param {string} storeName - 店舗名
 * @return {Object} 処理結果
 */
function deleteStore(storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!storeName) {
      return { success: false, message: '店舗名を指定してください' };
    }
    
    // 店舗マスターシートからデータを取得
    const storeSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = storeData[0];
    const nameIndex = headers.indexOf('店舗名');
    
    if (nameIndex === -1) {
      return { success: false, message: '店舗マスターシートの形式が正しくありません' };
    }
    
    // 該当店舗の行を検索
    let rowIndex = -1;
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][nameIndex] === storeName) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: '指定された店舗が見つかりません' };
    }
    
    // 店舗を削除
    storeSheet.deleteRow(rowIndex);
    
    // ウィッグ在庫シートからも該当店舗のデータを削除
    const inventorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    const inventoryHeaders = inventoryData[0];
    const storeIndex = inventoryHeaders.indexOf('店舗');
    
    if (storeIndex !== -1) {
      for (let i = 1; i < inventoryData.length; i++) {
        if (inventoryData[i][storeIndex] === storeName) {
          inventorySheet.deleteRow(i + 1);
          break;
        }
      }
    }
    
    return {
      success: true,
      message: '店舗が削除されました'
    };
  } catch (e) {
    console.error('店舗削除エラー: ' + e);
    return { success: false, message: '店舗の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職一覧を取得する
 * 
 * @return {Object} 役職一覧
 */
function getRoles() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // 役職マスターシートからデータを取得
    const roleSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません' };
    }
    
    // 役職名の配列を作成
    const roles = [];
    for (let i = 1; i < roleData.length; i++) {
      roles.push(roleData[i][nameIndex]);
    }
    
    return {
      success: true,
      data: roles
    };
  } catch (e) {
    console.error('役職一覧取得エラー: ' + e);
    return { success: false, message: '役職一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職を追加する
 * 
 * @param {string} roleName - 役職名
 * @return {Object} 処理結果
 */
function addRole(roleName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!roleName) {
      return { success: false, message: '役職名を入力してください' };
    }
    
    // 役職マスターシートからデータを取得
    const roleSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません' };
    }
    
    // 既存の役職名と重複がないか確認
    for (let i = 1; i < roleData.length; i++) {
      if (roleData[i][nameIndex] === roleName) {
        return { success: false, message: 'この役職名は既に登録されています' };
      }
    }
    
    // 新しい役職を追加
    roleSheet.appendRow([roleName]);
    
    return {
      success: true,
      message: '役職が追加されました'
    };
  } catch (e) {
    console.error('役職追加エラー: ' + e);
    return { success: false, message: '役職の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 役職を削除する
 * 
 * @param {string} roleName - 役職名
 * @return {Object} 処理結果
 */
function deleteRole(roleName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!roleName) {
      return { success: false, message: '役職名を指定してください' };
    }
    
    // 役職マスターシートからデータを取得
    const roleSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROLE_MASTER_SHEET_NAME);
    const roleData = roleSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = roleData[0];
    const nameIndex = headers.indexOf('役職名');
    
    if (nameIndex === -1) {
      return { success: false, message: '役職マスターシートの形式が正しくありません' };
    }
    
    // 該当役職の行を検索
    let rowIndex = -1;
    for (let i = 1; i < roleData.length; i++) {
      if (roleData[i][nameIndex] === roleName) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: '指定された役職が見つかりません' };
    }
    
    // 役職を削除
    roleSheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: '役職が削除されました'
    };
  } catch (e) {
    console.error('役職削除エラー: ' + e);
    return { success: false, message: '役職の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * トレーナー一覧を取得する
 * 
 * @return {Object} トレーナー一覧
 */
function getAllTrainers() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // トレーナーマスターシートからデータを取得
    const trainerSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません' };
    }
    
    // トレーナー情報の配列を作成
    const trainers = [];
    for (let i = 1; i < trainerData.length; i++) {
      trainers.push({
        name: trainerData[i][nameIndex],
        store: trainerData[i][storeIndex]
      });
    }
    
    return {
      success: true,
      data: trainers
    };
  } catch (e) {
    console.error('トレーナー一覧取得エラー: ' + e);
    return { success: false, message: 'トレーナー一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * トレーナーを追加する
 * 
 * @param {string} trainerName - トレーナー名
 * @param {string} storeName - 店舗名
 * @return {Object} 処理結果
 */
function addTrainer(trainerName, storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!trainerName || !storeName) {
      return { success: false, message: 'トレーナー名と店舗名を入力してください' };
    }
    
    // トレーナーマスターシートからデータを取得
    const trainerSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません' };
    }
    
    // 既存のトレーナー名と店舗の組み合わせで重複がないか確認
    for (let i = 1; i < trainerData.length; i++) {
      if (trainerData[i][nameIndex] === trainerName && trainerData[i][storeIndex] === storeName) {
        return { success: false, message: 'このトレーナーと店舗の組み合わせは既に登録されています' };
      }
    }
    
    // 新しいトレーナーを追加
    trainerSheet.appendRow([trainerName, storeName]);
    
    return {
      success: true,
      message: 'トレーナーが追加されました'
    };
  } catch (e) {
    console.error('トレーナー追加エラー: ' + e);
    return { success: false, message: 'トレーナーの追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * トレーナーを削除する
 * 
 * @param {string} trainerName - トレーナー名
 * @param {string} storeName - 店舗名
 * @return {Object} 処理結果
 */
function deleteTrainer(trainerName, storeName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!trainerName || !storeName) {
      return { success: false, message: 'トレーナー名と店舗名を指定してください' };
    }
    
    // トレーナーマスターシートからデータを取得
    const trainerSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません' };
    }
    
    // 該当トレーナーの行を検索
    let rowIndex = -1;
    for (let i = 1; i < trainerData.length; i++) {
      if (trainerData[i][nameIndex] === trainerName && trainerData[i][storeIndex] === storeName) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: '指定されたトレーナーと店舗の組み合わせが見つかりません' };
    }
    
    // トレーナーを削除
    trainerSheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: 'トレーナーが削除されました'
    };
  } catch (e) {
    console.error('トレーナー削除エラー: ' + e);
    return { success: false, message: 'トレーナーの削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 技術カテゴリー一覧を取得する
 * 
 * @return {Object} 技術カテゴリー一覧
 */
function getAllTechCategories() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // 技術カテゴリーマスターシートからデータを取得
    const categorySheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || roleIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません' };
    }
    
    // カテゴリー情報の配列を作成
    const categories = [];
    for (let i = 1; i < categoryData.length; i++) {
      categories.push({
        name: categoryData[i][nameIndex],
        roles: categoryData[i][roleIndex].toString().split(',').map(role => role.trim())
      });
    }
    
    return {
      success: true,
      data: categories
    };
  } catch (e) {
    console.error('技術カテゴリー一覧取得エラー: ' + e);
    return { success: false, message: '技術カテゴリー一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 技術カテゴリーを追加する
 * 
 * @param {string} categoryName - カテゴリー名
 * @param {string} roles - 対象役職（カンマ区切り）
 * @return {Object} 処理結果
 */
function addTechCategory(categoryName, roles) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!categoryName || !roles) {
      return { success: false, message: 'カテゴリー名と対象役職を入力してください' };
    }
    
    // 技術カテゴリーマスターシートからデータを取得
    const categorySheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    
    if (nameIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません' };
    }
    
    // 既存のカテゴリー名で重複がないか確認
    for (let i = 1; i < categoryData.length; i++) {
      if (categoryData[i][nameIndex] === categoryName) {
        return { success: false, message: 'このカテゴリー名は既に登録されています' };
      }
    }
    
    // 新しいカテゴリーを追加
    categorySheet.appendRow([categoryName, roles]);
    
    return {
      success: true,
      message: '技術カテゴリーが追加されました'
    };
  } catch (e) {
    console.error('技術カテゴリー追加エラー: ' + e);
    return { success: false, message: '技術カテゴリーの追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 技術カテゴリーを削除する
 * 
 * @param {string} categoryName - カテゴリー名
 * @return {Object} 処理結果
 */
function deleteTechCategory(categoryName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!categoryName) {
      return { success: false, message: 'カテゴリー名を指定してください' };
    }
    
    // 技術カテゴリーマスターシートからデータを取得
    const categorySheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME);
    const categoryData = categorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    
    if (nameIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません' };
    }
    
    // 該当カテゴリーの行を検索
    let rowIndex = -1;
    for (let i = 1; i < categoryData.length; i++) {
      if (categoryData[i][nameIndex] === categoryName) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: '指定されたカテゴリーが見つかりません' };
    }
    
    // カテゴリーを削除
    categorySheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: '技術カテゴリーが削除されました'
    };
  } catch (e) {
    console.error('技術カテゴリー削除エラー: ' + e);
    return { success: false, message: '技術カテゴリーの削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 詳細技術項目一覧を取得する
 * 
 * @return {Object} 詳細技術項目一覧
 */
function getAllTechDetails() {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    // 詳細技術項目マスターシートからデータを取得
    const detailSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || categoryIndex === -1 || roleIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません' };
    }
    
    // 詳細項目情報の配列を作成
    const details = [];
    for (let i = 1; i < detailData.length; i++) {
      details.push({
        name: detailData[i][nameIndex],
        category: detailData[i][categoryIndex],
        roles: detailData[i][roleIndex].toString().split(',').map(role => role.trim())
      });
    }
    
    return {
      success: true,
      data: details
    };
  } catch (e) {
    console.error('詳細技術項目一覧取得エラー: ' + e);
    return { success: false, message: '詳細技術項目一覧の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 詳細技術項目を追加する
 * 
 * @param {string} detailName - 項目名
 * @param {string} categoryName - カテゴリー名
 * @param {string} roles - 対象役職（カンマ区切り）
 * @return {Object} 処理結果
 */
function addTechDetail(detailName, categoryName, roles) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!detailName || !categoryName || !roles) {
      return { success: false, message: '項目名、カテゴリー名、対象役職を入力してください' };
    }
    
    // 詳細技術項目マスターシートからデータを取得
    const detailSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    
    if (nameIndex === -1 || categoryIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません' };
    }
    
    // 既存の項目名とカテゴリーの組み合わせで重複がないか確認
    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][nameIndex] === detailName && detailData[i][categoryIndex] === categoryName) {
        return { success: false, message: 'この項目名とカテゴリーの組み合わせは既に登録されています' };
      }
    }
    
    // 新しい詳細項目を追加
    detailSheet.appendRow([detailName, categoryName, roles]);
    
    return {
      success: true,
      message: '詳細技術項目が追加されました'
    };
  } catch (e) {
    console.error('詳細技術項目追加エラー: ' + e);
    return { success: false, message: '詳細技術項目の追加中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 詳細技術項目を削除する
 * 
 * @param {string} detailName - 項目名
 * @param {string} categoryName - カテゴリー名
 * @return {Object} 処理結果
 */
function deleteTechDetail(detailName, categoryName) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!detailName || !categoryName) {
      return { success: false, message: '項目名とカテゴリー名を指定してください' };
    }
    
    // 詳細技術項目マスターシートからデータを取得
    const detailSheet = preadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME);
    const detailData = detailSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    
    if (nameIndex === -1 || categoryIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません' };
    }
    
    // 該当詳細項目の行を検索
    let rowIndex = -1;
    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][nameIndex] === detailName && detailData[i][categoryIndex] === categoryName) {
        rowIndex = i + 1; // シートの行番号は1から始まる
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: '指定された項目名とカテゴリーの組み合わせが見つかりません' };
    }
    
    // 詳細項目を削除
    detailSheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: '詳細技術項目が削除されました'
    };
  } catch (e) {
    console.error('詳細技術項目削除エラー: ' + e);
    return { success: false, message: '詳細技術項目の削除中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * ウィッグ在庫数を手動更新する
 * 
 * @param {string} store - 店舗名
 * @param {number} stockCount - 在庫数
 * @return {Object} 処理結果
 */
function updateWigStock(store, stockCount) {
  try {
    // 管理者権限チェック
    if (!checkAdminAccess()) {
      return { success: false, message: '管理者権限が必要です' };
    }
    
    if (!store) {
      return { success: false, message: '店舗名を指定してください' };
    }
    
    if (isNaN(stockCount)) {
      return { success: false, message: '在庫数は数値で入力してください' };
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
      inventorySheet.appendRow([store, stockCount]);
      return { success: true, message: '店舗のウィッグ在庫が新規登録されました' };
    } else {
      // 既存の在庫を更新
      inventorySheet.getRange(rowIndex, stockIndex + 1).setValue(stockCount);
      return { success: true, message: '店舗のウィッグ在庫が更新されました' };
    }
  } catch (e) {
    console.error('ウィッグ在庫更新エラー: ' + e);
    return { success: false, message: 'ウィッグ在庫の更新中にエラーが発生しました: ' + e.toString() };
  }
}