/**
 * 美容師練習管理Webアプリケーション
 * 認証・セッション管理・関連データ取得 のGASファイル (デバッグログ強化版)
 */

/**
 * セッションの存在を確認し、ユーザー情報を返す
 * 
 * @return {Object|null} ユーザー情報オブジェクト、または未ログインならnull
 */
function checkSession() {
  const userProperties = PropertiesService.getUserProperties();
  const sessionData = userProperties.getProperty('session');
  Logger.log('checkSession: セッションデータ取得試行...'); // ★デバッグログ追加
  
  if (!sessionData) {
    Logger.log('checkSession: セッションデータなし (未ログイン)'); // ★デバッグログ追加
    return null;
  }
  
  try {
    const userInfo = JSON.parse(sessionData);
    Logger.log('checkSession: セッションデータあり, User: ' + userInfo['メールアドレス'] || userInfo.email); // ★デバッグログ追加
    return userInfo;
  } catch (e) {
    console.error('セッションデータの解析に失敗しました: ' + e);
    Logger.log('checkSession: セッションデータ解析エラー - ' + e.toString()); // ★デバッグログ追加
    PropertiesService.getUserProperties().deleteProperty('session'); 
    return null; 
  }
}

/**
 * セッションにユーザー情報を保存する
 * 
 * @param {Object} userInfo - 保存するユーザー情報オブジェクト
 */
function setSession(userInfo) {
  const userProperties = PropertiesService.getUserProperties();
  try {
    const sessionJson = JSON.stringify(userInfo);
    Logger.log('setSession: ユーザー情報をセッションに保存 - ' + sessionJson); // ★デバッグログ追加
    userProperties.setProperty('session', sessionJson);
  } catch (e) {
    console.error('セッション情報の保存に失敗しました: ' + e);
    Logger.log('setSession: セッション保存エラー - ' + e.toString()); // ★デバッグログ追加
  }
}

/**
 * セッションからログアウトする（セッション情報を削除する）
 * 
 * @return {Object} ログアウト処理の結果 { success: boolean, message?: string }
 */
function logout() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    Logger.log('logout: セッション削除実行'); // ★デバッグログ追加
    userProperties.deleteProperty('session');
    
    return { success: true }; 
  } catch (e) {
    console.error('ログアウトエラー: ' + e);
    Logger.log('logout: ログアウトエラー - ' + e.toString()); // ★デバッグログ追加
    return { success: false, message: 'ログアウト処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * Googleアカウント認証でログインを試みる
 * 
 * @return {Object} ログイン結果 { success: boolean, userInfo?: Object, message?: string }
 */
function loginWithGoogle() {
  Logger.log('loginWithGoogle: Googleログイン処理開始'); // ★デバッグログ追加
  try {
    const userEmail = Session.getActiveUser().getEmail();
    Logger.log('loginWithGoogle: 取得したメールアドレス = ' + userEmail); // ★デバッグログ追加
    
    if (!userEmail) {
      Logger.log('loginWithGoogle: Googleアカウント情報の取得失敗'); // ★デバッグログ追加
      return { success: false, message: 'Googleアカウント情報の取得に失敗しました。' };
    }
    
    const userInfo = findUserByEmail(userEmail); // 下の関数でログ出力
    
    if (!userInfo) {
      // findUserByEmail関数内でログ出力されるので、ここでは不要
      return { success: false, message: 'スタッフ情報が見つかりません。システム管理者に連絡してください。' };
    }
    
    setSession(userInfo); // 下の関数でログ出力
    
    Logger.log('loginWithGoogle: Googleログイン成功'); // ★デバッグログ追加
    return { 
      success: true, 
      userInfo: userInfo 
    };
  } catch (e) {
    console.error('Google認証エラー: ' + e);
    Logger.log('loginWithGoogle: Google認証エラー - ' + e.toString() + '\n' + e.stack); // ★スタックトレース追加
    return { success: false, message: 'ログイン処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 社員番号とパスワードでログインを試みる
 * 
 * @param {string} empId - 入力された社員番号
 * @param {string} password - 入力されたパスワード
 * @return {Object} ログイン結果 { success: boolean, userInfo?: Object, message?: string }
 */
function loginWithCredentials(empId, password) {
  Logger.log('loginWithCredentials: ID/PWログイン試行 - 社員番号=' + empId); // ★デバッグログ追加
  try {
    if (!empId || !password) {
      Logger.log('loginWithCredentials: 社員番号またはパスワード未入力'); // ★デバッグログ追加
      return { success: false, message: '社員番号とパスワードを入力してください。' };
    }
    
    const userInfo = findUserByEmpId(empId); // 下の関数でログ出力
    
    if (!userInfo) {
      // findUserByEmpId関数内でログ出力されるので、ここでは不要
      return { success: false, message: 'スタッフ情報が見つかりません。' };
    }
    
    Logger.log('loginWithCredentials: パスワード検証開始 - 社員番号=' + empId + ', 入力パスワード=' + password); // ★デバッグログ追加
    if (!validatePassword(empId, password)) { // 下の関数でログ出力
      Logger.log('loginWithCredentials: パスワード検証失敗'); // ★デバッグログ追加
      return { success: false, message: '社員番号またはパスワードが正しくありません。' };
    }
    
    setSession(userInfo); // 下の関数でログ出力
    
    Logger.log('loginWithCredentials: ID/PWログイン成功'); // ★デバッグログ追加
    return { 
      success: true, 
      userInfo: userInfo 
    };
  } catch (e) {
    console.error('ID/パスワード認証エラー: ' + e);
    Logger.log('loginWithCredentials: ID/PW認証エラー - ' + e.toString() + '\n' + e.stack); // ★スタックトレース追加
    return { success: false, message: 'ログイン処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * パスワードを検証する（ハッシュ化対応準備）
 * 
 * @param {string} empId - 社員番号
 * @param {string} password - 入力されたパスワード
 * @return {boolean} パスワードが正しければtrue
 */
function validatePassword(empId, password) {
  Logger.log('validatePassword: 検証開始 - 社員番号=' + empId); // ★デバッグログ追加
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号'); 
    const passwordHashIndex = headers.indexOf('パスワードハッシュ'); // ★★★ 列名を確認 ★★★
    
    if (empIdIndex === -1 || passwordHashIndex === -1) {
      console.error('スタッフマスターシートに必要な列（社員番号 or パスワードハッシュ）がありません。');
      Logger.log('validatePassword: 必要な列が見つかりません。'); // ★デバッグログ追加
      return false;
    }
    
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][empIdIndex] == empId) { 
        const storedValue = staffData[i][passwordHashIndex];
        // ★★★ 型も含めてログ出力 ★★★
        Logger.log('validatePassword: 一致する社員番号発見 (行' + (i+1) + ') - 保存値=[' + storedValue + '] (' + typeof storedValue + '), 入力値=[' + password + '] (' + typeof password + ')'); 
        
        // --- Step 1 での実装箇所 (ハッシュ比較) ---
        // return BcryptGS.checkpw(password, storedValue); 
        
        // --- 現状の仮実装 (厳密な比較) ---
        // スプレッドシートの値が数値の場合も考慮し、両方を文字列に変換して比較する
        const validationResult = String(storedValue) === String(password); 
        Logger.log('validatePassword: 比較結果 = ' + validationResult); // ★デバッグログ追加
        return validationResult;
        // --- 仮実装ここまで ---
      }
    }
    
    Logger.log('validatePassword: 一致する社員番号が見つかりませんでした。'); // ★デバッグログ追加
    return false; // ユーザーが見つからない
  } catch (e) {
    console.error('パスワード検証エラー: ' + e);
    Logger.log('validatePassword: 検証エラー - ' + e.toString()); // ★デバッグログ追加
    return false; 
  }
}


/**
 * メールアドレスからユーザー情報をスタッフマスターシートで検索する
 * 
 * @param {string} email - 検索するメールアドレス
 * @return {Object|null} 見つかったユーザー情報オブジェクト、またはnull
 */
function findUserByEmail(email) {
  Logger.log('findUserByEmail: 検索開始 - メールアドレス=' + email); // ★デバッグログ追加
  if (!email) {
     Logger.log('findUserByEmail: メールアドレスが指定されていません。');
     return null;
  }
  
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    const headers = staffData[0];
    const emailIndex = headers.indexOf('メールアドレス'); // 列名を確認

    if (emailIndex === -1) {
      console.error('スタッフマスターシートに「メールアドレス」列がありません。');
      Logger.log('findUserByEmail: 「メールアドレス」列が見つかりません。'); // ★デバッグログ追加
      return null;
    }
    
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][emailIndex] === email) {
        Logger.log('findUserByEmail: 一致するメールアドレス発見 (行' + (i+1) + ')'); // ★デバッグログ追加
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
          userInfo[headers[j]] = staffData[i][j]; 
        }
        Logger.log('findUserByEmail: 取得したユーザー情報: ' + JSON.stringify(userInfo)); // ★デバッグログ追加
        return userInfo; 
      }
    }
    
    Logger.log('findUserByEmail: 一致するメールアドレスが見つかりませんでした。'); // ★デバッグログ追加
    return null; // 見つからなかった場合
  } catch (e) {
    console.error('メールアドレスによるユーザー検索エラー: ' + e);
    Logger.log('findUserByEmail: 検索エラー - ' + e.toString()); // ★デバッグログ追加
    return null; 
  }
}

/**
 * 社員番号からユーザー情報をスタッフマスターシートで検索する
 * 
 * @param {string|number} empId - 検索する社員番号
 * @return {Object|null} 見つかったユーザー情報オブジェクト、またはnull
 */
function findUserByEmpId(empId) {
  Logger.log('findUserByEmpId: 検索開始 - 社員番号=' + empId); // ★デバッグログ追加
  if (!empId) {
      Logger.log('findUserByEmpId: 社員番号が指定されていません。');
      return null;
  } 
  
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号'); // 列名を確認

    if (empIdIndex === -1) {
      console.error('スタッフマスターシートに「社員番号」列がありません。');
      Logger.log('findUserByEmpId: 「社員番号」列が見つかりません。'); // ★デバッグログ追加
      return null;
    }
    
    for (let i = 1; i < staffData.length; i++) {
      // ★★★ 型を考慮して比較 ★★★
      if (String(staffData[i][empIdIndex]) === String(empId)) { 
         Logger.log('findUserByEmpId: 一致する社員番号発見 (行' + (i+1) + ')'); // ★デバッグログ追加
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
          userInfo[headers[j]] = staffData[i][j];
        }
         Logger.log('findUserByEmpId: 取得したユーザー情報: ' + JSON.stringify(userInfo)); // ★デバッグログ追加
        return userInfo; 
      }
    }
    
    Logger.log('findUserByEmpId: 一致する社員番号が見つかりませんでした。'); // ★デバッグログ追加
    return null; // 見つからなかった場合
  } catch (e) {
    console.error('社員番号によるユーザー検索エラー: ' + e);
    Logger.log('findUserByEmpId: 検索エラー - ' + e.toString()); // ★デバッグログ追加
    return null; 
  }
}

/**
 * ログインユーザーに対応するトレーナーリスト（所属店舗、他店舗）を取得する
 * 
 * @return {Object} トレーナー情報 { success: boolean, data?: { userStoreTrainers: Array, otherStoreTrainers: Array }, message?: string }
 */
function getTrainers() {
  Logger.log('getTrainers: トレーナーリスト取得開始'); // ★デバッグログ追加
  try {
    const userSession = checkSession(); // checkSession内でログ出力
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    const userStore = userSession.店舗; 
    Logger.log('getTrainers: ログインユーザーの店舗 = ' + userStore); // ★デバッグログ追加
    
    const trainerMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerMasterSheet.getDataRange().getValues();
    
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前'); 
    const storeIndex = headers.indexOf('店舗'); 
    
    if (nameIndex === -1 || storeIndex === -1) {
      Logger.log('getTrainers: トレーナーマスターシートの形式不正'); // ★デバッグログ追加
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }
    
    const userStoreTrainers = [];
    const otherStoreTrainers = [];
    
    for (let i = 1; i < trainerData.length; i++) {
      const trainer = {
        name: trainerData[i][nameIndex],
        store: trainerData[i][storeIndex]
      };
      if (trainer.name && trainer.store) { // 名前と店舗がある場合のみ
          if (trainer.store === userStore) {
            userStoreTrainers.push(trainer);
          } else {
            otherStoreTrainers.push(trainer);
          }
      }
    }
    Logger.log('getTrainers: 同店舗トレーナー数=' + userStoreTrainers.length + ', 他店舗トレーナー数=' + otherStoreTrainers.length); // ★デバッグログ追加
    
    return {
      success: true,
      data: {
        userStoreTrainers: userStoreTrainers,
        otherStoreTrainers: otherStoreTrainers
      }
    };
  } catch (e) {
    console.error('トレーナー情報取得エラー: ' + e);
     Logger.log('getTrainers: 取得エラー - ' + e.toString()); // ★デバッグログ追加
    return { success: false, message: 'トレーナー情報の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * ログインユーザーの役職に対応する技術カテゴリーリストを取得する
 * 
 * @return {Object} カテゴリーリスト { success: boolean, data?: Array<string>, message?: string }
 */
function getTechCategories() {
  Logger.log('getTechCategories: カテゴリーリスト取得開始'); // ★デバッグログ追加
  try {
    const userSession = checkSession(); // checkSession内でログ出力
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    const userRole = userSession.Role; 
    Logger.log('getTechCategories: ログインユーザーの役職 = ' + userRole); // ★デバッグログ追加
    if (!userRole) {
        Logger.log('getTechCategories: ユーザー役職情報なし'); // ★デバッグログ追加
        return { success: false, message: 'ユーザーの役職情報が見つかりません。' };
    }
    
    const techCategorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME); 
    const categoryData = techCategorySheet.getDataRange().getValues();
    
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || roleIndex === -1) {
       Logger.log('getTechCategories: カテゴリーマスターシートの形式不正'); // ★デバッグログ追加
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }
    
    const availableCategories = [];
    for (let i = 1; i < categoryData.length; i++) {
      const categoryName = categoryData[i][nameIndex];
      const targetRolesString = categoryData[i][roleIndex] ? categoryData[i][roleIndex].toString() : '';
      const targetRoles = targetRolesString.split(',').map(role => role.trim()).filter(role => role); 
      
      if (categoryName && (targetRoles.includes(userRole) || targetRoles.includes('全て'))) {
        availableCategories.push(categoryName);
      }
    }
    Logger.log('getTechCategories: 利用可能なカテゴリー数=' + availableCategories.length); // ★デバッグログ追加
    
    return { success: true, data: availableCategories };
  } catch (e) {
    console.error('技術カテゴリー取得エラー: ' + e);
     Logger.log('getTechCategories: 取得エラー - ' + e.toString()); // ★デバッグログ追加
    return { success: false, message: '技術カテゴリーの取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * 指定されたカテゴリーに属し、ログインユーザーの役職に対応する詳細技術項目リストを取得する
 * 
 * @param {string} category - 技術カテゴリー名
 * @return {Object} 詳細項目リスト { success: boolean, data?: Array<string>, message?: string }
 */
function getTechDetails(category) {
  Logger.log('getTechDetails: 詳細項目リスト取得開始 - カテゴリー=' + category); // ★デバッグログ追加
  try {
    if (!category) {
      Logger.log('getTechDetails: カテゴリー未指定'); // ★デバッグログ追加
      return { success: false, message: 'カテゴリーが指定されていません。' };
    }
    
    const userSession = checkSession(); // checkSession内でログ出力
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    const userRole = userSession.Role; 
    Logger.log('getTechDetails: ログインユーザーの役職 = ' + userRole); // ★デバッグログ追加
    if (!userRole) {
        Logger.log('getTechDetails: ユーザー役職情報なし'); // ★デバッグログ追加
        return { success: false, message: 'ユーザーの役職情報が見つかりません。' };
    }
    
    const techDetailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME); 
    const detailData = techDetailSheet.getDataRange().getValues();
    
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || categoryIndex === -1 || roleIndex === -1) {
      Logger.log('getTechDetails: 詳細項目マスターシートの形式不正'); // ★デバッグログ追加
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }
    
    const availableDetails = [];
    for (let i = 1; i < detailData.length; i++) {
      const detailName = detailData[i][nameIndex];
      const detailCategory = detailData[i][categoryIndex];
      const targetRolesString = detailData[i][roleIndex] ? detailData[i][roleIndex].toString() : '';
      const targetRoles = targetRolesString.split(',').map(role => role.trim()).filter(role => role); 
      
      if (detailName && detailCategory === category && (targetRoles.includes(userRole) || targetRoles.includes('全て'))) {
        availableDetails.push(detailName);
      }
    }
    Logger.log('getTechDetails: 利用可能な詳細項目数=' + availableDetails.length); // ★デバッグログ追加
    
    return { success: true, data: availableDetails };
  } catch (e) {
    console.error('詳細技術項目取得エラー: ' + e);
    Logger.log('getTechDetails: 取得エラー - ' + e.toString()); // ★デバッグログ追加
    return { success: false, message: '詳細技術項目の取得中にエラーが発生しました: ' + e.toString() };
  }
}