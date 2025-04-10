/**
 * 美容師練習管理Webアプリケーション
 * 認証関連のGASファイル
 * 
 * このスクリプトは認証・認可に関連する機能を提供します。
 */

/**
 * 現在ログインしているユーザー情報を取得する
 * 
 * @return {Object|null} ユーザー情報またはnull（未ログイン）
 */
function getCurrentUser() {
  return checkSession();
}

/**
 * ユーザーが管理者かどうかを確認する
 * 
 * @return {boolean} 管理者であればtrue
 */
function checkAdminAccess() {
  const userSession = checkSession();
  
  if (!userSession) {
    return false;
  }
  
  return isAdmin(userSession.メールアドレス || userSession.email);
}

/**
 * ログイン時にスタッフマスターシートからトレーナー一覧を取得する
 * 
 * @return {Object} トレーナー一覧
 */
function getTrainers() {
  try {
    // 現在のユーザー情報を取得
    const userSession = checkSession();
    
    if (!userSession) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // ユーザーの所属店舗を取得
    const userStore = userSession.店舗;
    
    // トレーナーマスターシートからトレーナー情報を取得
    const trainerMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerMasterSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません' };
    }
    
    // ユーザーの所属店舗のトレーナーを抽出
    const userStoreTrainers = [];
    const otherStoreTrainers = [];
    
    for (let i = 1; i < trainerData.length; i++) {
      const trainer = {
        name: trainerData[i][nameIndex],
        store: trainerData[i][storeIndex]
      };
      
      if (trainer.store === userStore) {
        userStoreTrainers.push(trainer);
      } else {
        otherStoreTrainers.push(trainer);
      }
    }
    
    // 固定の選択肢を追加
    const fixedOptions = [
      { name: '自主練', store: 'システム' },
      { name: 'その他', store: 'システム' },
      { name: '他店舗トレーナー', store: 'システム' }
    ];
    
    return {
      success: true,
      data: {
        userStoreTrainers: userStoreTrainers,
        otherStoreTrainers: otherStoreTrainers,
        fixedOptions: fixedOptions
      }
    };
  } catch (e) {
    console.error('トレーナー情報取得エラー: ' + e);
    return { success: false, message: 'トレーナー情報の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * ログイン時に役職に応じた技術カテゴリー一覧を取得する
 * 
 * @return {Object} 技術カテゴリー一覧
 */
function getTechCategories() {
  try {
    // 現在のユーザー情報を取得
    const userSession = checkSession();
    
    if (!userSession) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // ユーザーの役職を取得
    const userRole = userSession.Role;
    
    // 技術カテゴリーマスターシートからカテゴリー情報を取得
    const trainerMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const categoryData = techCategorySheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || roleIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません' };
    }
    
    // ユーザーの役職に対応するカテゴリーを抽出
    const availableCategories = [];
    
    for (let i = 1; i < categoryData.length; i++) {
      const categoryName = categoryData[i][nameIndex];
      const targetRoles = categoryData[i][roleIndex].toString().split(',').map(role => role.trim());
      
      // ユーザーの役職がカテゴリーの対象役職に含まれているか確認
      if (targetRoles.includes(userRole) || targetRoles.includes('全て')) {
        availableCategories.push(categoryName);
      }
    }
    
    return {
      success: true,
      data: availableCategories
    };
  } catch (e) {
    console.error('技術カテゴリー取得エラー: ' + e);
    return { success: false, message: '技術カテゴリーの取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * カテゴリーに応じた詳細技術項目一覧を取得する
 * 
 * @param {string} category - 技術カテゴリー名
 * @return {Object} 詳細技術項目一覧
 */
function getTechDetails(category) {
  try {
    if (!category) {
      return { success: false, message: 'カテゴリーが指定されていません' };
    }
    
    // 現在のユーザー情報を取得
    const userSession = checkSession();
    
    if (!userSession) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // ユーザーの役職を取得
    const userRole = userSession.Role;
    
    // 詳細技術項目マスターシートから項目情報を取得
    const trainerMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const detailData = techDetailSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || categoryIndex === -1 || roleIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません' };
    }
    
    // 指定されたカテゴリーかつユーザーの役職に対応する項目を抽出
    const availableDetails = [];
    
    for (let i = 1; i < detailData.length; i++) {
      const detailName = detailData[i][nameIndex];
      const detailCategory = detailData[i][categoryIndex];
      const targetRoles = detailData[i][roleIndex].toString().split(',').map(role => role.trim());
      
      // カテゴリーが一致し、かつユーザーの役職が対象に含まれているか確認
      if (detailCategory === category && (targetRoles.includes(userRole) || targetRoles.includes('全て'))) {
        availableDetails.push(detailName);
      }
    }
    
    return {
      success: true,
      data: availableDetails
    };
  } catch (e) {
    console.error('詳細技術項目取得エラー: ' + e);
    return { success: false, message: '詳細技術項目の取得中にエラーが発生しました: ' + e.toString() };
  }
}