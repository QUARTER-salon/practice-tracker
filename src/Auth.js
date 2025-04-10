/**
 * 美容師練習管理Webアプリケーション
 * 認証・セッション管理・関連データ取得 のGASファイル
 */

/**
 * セッションの存在を確認し、ユーザー情報を返す
 * 
 * @return {Object|null} ユーザー情報オブジェクト、または未ログインならnull
 */
function checkSession() {
  const userProperties = PropertiesService.getUserProperties();
  const sessionData = userProperties.getProperty('session');
  
  if (!sessionData) {
    // セッションデータが存在しない場合は未ログイン
    return null;
  }
  
  try {
    // セッションデータをJSONオブジェクトにパースして返す
    return JSON.parse(sessionData);
  } catch (e) {
    console.error('セッションデータの解析に失敗しました: ' + e);
    // セッションデータが壊れている可能性があるので削除
    PropertiesService.getUserProperties().deleteProperty('session'); 
    return null; // 解析失敗時も未ログイン扱い
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
    // ユーザー情報をJSON文字列に変換してユーザープロパティに保存
    userProperties.setProperty('session', JSON.stringify(userInfo));
  } catch (e) {
    console.error('セッション情報の保存に失敗しました: ' + e);
    // エラーが発生した場合の処理（必要であれば）
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
    // 'session' プロパティを削除
    userProperties.deleteProperty('session');
    
    return { success: true }; // 成功したことを示すオブジェクトを返す
  } catch (e) {
    console.error('ログアウトエラー: ' + e);
    return { success: false, message: 'ログアウト処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * Googleアカウント認証でログインを試みる
 * 
 * @return {Object} ログイン結果 { success: boolean, userInfo?: Object, message?: string }
 */
function loginWithGoogle() {
  try {
    // 現在アクティブなユーザーのメールアドレスを取得
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      // メールアドレスが取得できない場合（通常は発生しないはず）
      return { success: false, message: 'Googleアカウント情報の取得に失敗しました。' };
    }
    
    // メールアドレスを元にスタッフマスターシートからユーザー情報を検索
    const userInfo = findUserByEmail(userEmail);
    
    if (!userInfo) {
      // スタッフマスターに該当するメールアドレスが存在しない場合
      return { success: false, message: 'スタッフ情報が見つかりません。システム管理者に連絡してください。' };
    }
    
    // ログイン成功。セッションにユーザー情報を保存
    setSession(userInfo);
    
    // 成功結果とユーザー情報を返す
    return { 
      success: true, 
      userInfo: userInfo 
    };
  } catch (e) {
    console.error('Google認証エラー: ' + e);
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
  try {
    // 社員番号とパスワードが入力されているかチェック
    if (!empId || !password) {
      return { success: false, message: '社員番号とパスワードを入力してください。' };
    }
    
    // 社員番号を元にスタッフマスターシートからユーザー情報を検索
    const userInfo = findUserByEmpId(empId);
    
    if (!userInfo) {
      // スタッフマスターに該当する社員番号が存在しない場合
      return { success: false, message: 'スタッフ情報が見つかりません。' };
    }
    
    // パスワードを検証
    if (!validatePassword(empId, password)) {
      // パスワードが一致しない場合
      return { success: false, message: '社員番号またはパスワードが正しくありません。' };
    }
    
    // ログイン成功。セッションにユーザー情報を保存
    setSession(userInfo);
    
    // 成功結果とユーザー情報を返す
    return { 
      success: true, 
      userInfo: userInfo 
    };
  } catch (e) {
    console.error('ID/パスワード認証エラー: ' + e);
    return { success: false, message: 'ログイン処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * パスワードを検証する（ハッシュ化対応準備）
 * ※ 現在は平文比較（非推奨）。Step 1 でハッシュ比較に要変更。
 * 
 * @param {string} empId - 社員番号
 * @param {string} password - 入力されたパスワード
 * @return {boolean} パスワードが正しければtrue
 */
function validatePassword(empId, password) {
  try {
    // スタッフマスターシートを取得
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    // ヘッダー行から列インデックスを取得
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号'); 
    // ★★★ パスワードハッシュ列名を 'PasswordHash' と仮定 ★★★
    const passwordHashIndex = headers.indexOf('PasswordHash'); 
    
    // 必要な列が存在するかチェック
    if (empIdIndex === -1 || passwordHashIndex === -1) {
      console.error('スタッフマスターシートに必要な列（社員番号 or PasswordHash）がありません。');
      return false; // 検証不可
    }
    
    // 該当する社員番号の行を検索
    for (let i = 1; i < staffData.length; i++) {
      // スプレッドシートの値は数値の場合もあるため `==` で比較
      if (staffData[i][empIdIndex] == empId) { 
        const storedHash = staffData[i][passwordHashIndex];
        
        // --- Step 1 での実装箇所 ---
        // ここで bcrypt などのライブラリを使って password と storedHash を比較する
        // 例: return BcryptGS.checkpw(password, storedHash); 
        // --- 実装箇所ここまで ---
        
        // --- 現状の仮実装 (平文比較 - セキュリティ上非常に危険！) ---
        // 実際の運用では必ずハッシュ比較に置き換えてください！
        Logger.log("パスワード検証中 (仮実装: 平文比較)"); // 仮実装であることをログに残す
        return storedHash === password; 
        // --- 仮実装ここまで ---
      }
    }
    
    return false; // 該当する社員番号が見つからない場合
  } catch (e) {
    console.error('パスワード検証エラー: ' + e);
    return false; // エラー発生時は検証失敗とする
  }
}

/**
 * メールアドレスからユーザー情報をスタッフマスターシートで検索する
 * 
 * @param {string} email - 検索するメールアドレス
 * @return {Object|null} 見つかったユーザー情報オブジェクト、またはnull
 */
function findUserByEmail(email) {
  if (!email) return null; // メールアドレスがなければ検索しない
  
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    const headers = staffData[0];
    const emailIndex = headers.indexOf('メールアドレス'); // 列名を確認

    if (emailIndex === -1) {
      console.error('スタッフマスターシートに「メールアドレス」列がありません。');
      return null;
    }
    
    // 1行目（ヘッダー）を除いて検索
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][emailIndex] === email) {
        // 見つかった行のデータをオブジェクトに変換して返す
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
          // 列名（ヘッダー）をキーとして値を取得
          // 必要であればここでキー名を英語に変換する処理を追加
          // 例: const key = headerToEnglishKey(headers[j]); userInfo[key] = staffData[i][j];
          userInfo[headers[j]] = staffData[i][j]; 
        }
        return userInfo; // 最初に見つかったものを返す
      }
    }
    
    return null; // 見つからなかった場合
  } catch (e) {
    console.error('メールアドレスによるユーザー検索エラー: ' + e);
    return null; // エラー発生時はnullを返す
  }
}

/**
 * 社員番号からユーザー情報をスタッフマスターシートで検索する
 * 
 * @param {string|number} empId - 検索する社員番号
 * @return {Object|null} 見つかったユーザー情報オブジェクト、またはnull
 */
function findUserByEmpId(empId) {
  if (!empId) return null; // 社員番号がなければ検索しない
  
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号'); // 列名を確認

    if (empIdIndex === -1) {
      console.error('スタッフマスターシートに「社員番号」列がありません。');
      return null;
    }
    
    // 1行目（ヘッダー）を除いて検索
    for (let i = 1; i < staffData.length; i++) {
      // スプレッドシートの社員番号が数値でも文字列でも比較できるよう `==` を使用
      if (staffData[i][empIdIndex] == empId) { 
        // 見つかった行のデータをオブジェクトに変換して返す
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
           // 列名（ヘッダー）をキーとして値を取得
           // 必要であればここでキー名を英語に変換
          userInfo[headers[j]] = staffData[i][j];
        }
        return userInfo; // 最初に見つかったものを返す
      }
    }
    
    return null; // 見つからなかった場合
  } catch (e) {
    console.error('社員番号によるユーザー検索エラー: ' + e);
    return null; // エラー発生時はnullを返す
  }
}

/**
 * ログインユーザーに対応するトレーナーリスト（所属店舗、他店舗）を取得する
 * 
 * @return {Object} トレーナー情報 { success: boolean, data?: { userStoreTrainers: Array, otherStoreTrainers: Array }, message?: string }
 */
function getTrainers() {
  try {
    const userSession = checkSession();
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    const userStore = userSession.店舗; // ログインユーザーの店舗名
    
    const trainerMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerMasterSheet.getDataRange().getValues();
    
    const headers = trainerData[0];
    const nameIndex = headers.indexOf('名前');
    const storeIndex = headers.indexOf('店舗');
    
    if (nameIndex === -1 || storeIndex === -1) {
      return { success: false, message: 'トレーナーマスターシートの形式が正しくありません。' };
    }
    
    const userStoreTrainers = [];
    const otherStoreTrainers = [];
    
    // 1行目（ヘッダー）を除いて処理
    for (let i = 1; i < trainerData.length; i++) {
      const trainer = {
        name: trainerData[i][nameIndex],
        store: trainerData[i][storeIndex]
      };
      
      // ユーザーと同じ店舗か、それ以外かで振り分ける
      if (trainer.store === userStore) {
        userStoreTrainers.push(trainer);
      } else {
        otherStoreTrainers.push(trainer);
      }
    }
    
    // フロントエンドで扱いやすいように整形して返す
    // 固定選択肢はフロントエンド側で追加してもよい
    return {
      success: true,
      data: {
        userStoreTrainers: userStoreTrainers,
        otherStoreTrainers: otherStoreTrainers
        // fixedOptions は削除 (フロント側で '自主練', 'その他', '他店舗〜' を追加)
      }
    };
  } catch (e) {
    console.error('トレーナー情報取得エラー: ' + e);
    return { success: false, message: 'トレーナー情報の取得中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * ログインユーザーの役職に対応する技術カテゴリーリストを取得する
 * 
 * @return {Object} カテゴリーリスト { success: boolean, data?: Array<string>, message?: string }
 */
function getTechCategories() {
  try {
    const userSession = checkSession();
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    // ユーザー情報の 'Role' 列名を確認
    const userRole = userSession.Role; 
    if (!userRole) {
        return { success: false, message: 'ユーザーの役職情報が見つかりません。' };
    }
    
    const techCategorySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_CATEGORY_SHEET_NAME); 
    const categoryData = techCategorySheet.getDataRange().getValues();
    
    const headers = categoryData[0];
    const nameIndex = headers.indexOf('カテゴリー名');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || roleIndex === -1) {
      return { success: false, message: '技術カテゴリーマスターシートの形式が正しくありません。' };
    }
    
    const availableCategories = [];
    // 1行目（ヘッダー）を除いて処理
    for (let i = 1; i < categoryData.length; i++) {
      const categoryName = categoryData[i][nameIndex];
      // 対象役職が空でないことを確認
      const targetRolesString = categoryData[i][roleIndex] ? categoryData[i][roleIndex].toString() : '';
      const targetRoles = targetRolesString.split(',').map(role => role.trim()).filter(role => role); // 空要素を除去
      
      // ユーザーの役職が対象に含まれるか、または '全て' が指定されているか
      if (targetRoles.includes(userRole) || targetRoles.includes('全て')) {
        if(categoryName) { // カテゴリー名が空でないことを確認
            availableCategories.push(categoryName);
        }
      }
    }
    
    return { success: true, data: availableCategories };
  } catch (e) {
    console.error('技術カテゴリー取得エラー: ' + e);
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
  try {
    // カテゴリーが指定されているかチェック
    if (!category) {
      return { success: false, message: 'カテゴリーが指定されていません。' };
    }
    
    const userSession = checkSession();
    if (!userSession) {
      return { success: false, message: 'ログインが必要です。' };
    }
    // ユーザー情報の 'Role' 列名を確認
    const userRole = userSession.Role; 
    if (!userRole) {
        return { success: false, message: 'ユーザーの役職情報が見つかりません。' };
    }
    
    const techDetailSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TECH_DETAIL_SHEET_NAME); 
    const detailData = techDetailSheet.getDataRange().getValues();
    
    const headers = detailData[0];
    const nameIndex = headers.indexOf('項目名');
    const categoryIndex = headers.indexOf('カテゴリー');
    const roleIndex = headers.indexOf('対象役職');
    
    if (nameIndex === -1 || categoryIndex === -1 || roleIndex === -1) {
      return { success: false, message: '詳細技術項目マスターシートの形式が正しくありません。' };
    }
    
    const availableDetails = [];
    // 1行目（ヘッダー）を除いて処理
    for (let i = 1; i < detailData.length; i++) {
      const detailName = detailData[i][nameIndex];
      const detailCategory = detailData[i][categoryIndex];
      // 対象役職が空でないことを確認
      const targetRolesString = detailData[i][roleIndex] ? detailData[i][roleIndex].toString() : '';
      const targetRoles = targetRolesString.split(',').map(role => role.trim()).filter(role => role); // 空要素を除去
      
      // カテゴリーが一致し、かつ (ユーザー役職が対象に含まれるか、または '全て' が指定されているか)
      if (detailCategory === category && (targetRoles.includes(userRole) || targetRoles.includes('全て'))) {
        if (detailName) { // 詳細項目名が空でないことを確認
            availableDetails.push(detailName);
        }
      }
    }
    
    return { success: true, data: availableDetails };
  } catch (e) {
    console.error('詳細技術項目取得エラー: ' + e);
    return { success: false, message: '詳細技術項目の取得中にエラーが発生しました: ' + e.toString() };
  }
}