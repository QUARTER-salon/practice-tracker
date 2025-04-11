/**
 * 美容師練習管理Webアプリケーション
 * 共通ユーティリティ関数
 */

/**
 * ユーザーが管理者権限を持っているか確認する
 * セッション情報をチェックし、isAdmin関数を呼び出す
 * 
 * @return {boolean} 管理者であればtrue、そうでなければfalse
 */
function checkAdminAccess() {
    // 現在のユーザーセッション情報を取得 (Auth.js の関数を呼び出す)
    const userSession = checkSession(); 
    
    // セッションが存在しない場合は管理者ではない
    if (!userSession) {
      return false;
    }
    
    // メールアドレスを元に管理者かどうかを判定 (isAdmin関数を呼び出す)
    // ユーザー情報オブジェクトのキー名 ('メールアドレス' または 'email') に注意
    const userEmail = userSession['メールアドレス'] || userSession.email; 
    return isAdmin(userEmail); // isAdmin内でログ出力あり
  }
  
  /**
   * 指定されたメールアドレスが管理者権限を持つか、スタッフマスターシートで確認する
   * 
   * @param {string} email - 確認するユーザーのメールアドレス
   * @return {boolean} 管理者であればtrue、そうでなければfalse
   */
  function isAdmin(email) {
    Logger.log('isAdmin: 関数開始 - 確認対象メールアドレス=[' + email + ']'); // ★引数確認ログ追加
    if (!email) {
      Logger.log('isAdmin: メールアドレスが指定されていません。 -> false');
      return false; 
    }
    
    try {
      const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
      const staffData = staffMasterSheet.getDataRange().getValues();
      const headers = staffData[0];
      const emailIndex = headers.indexOf('メールアドレス'); 
      const adminFlagIndex = headers.indexOf('管理者フラグ'); 
      
      Logger.log('isAdmin: 列インデックス - email=' + emailIndex + ', adminFlag=' + adminFlagIndex); // ★インデックス確認
  
      if (emailIndex === -1 || adminFlagIndex === -1) {
        console.error('スタッフマスターシートに必要な列（メールアドレス or 管理者フラグ）がありません。');
        Logger.log('isAdmin: 必要な列が見つかりません。 -> false');
        return false; 
      }
      
      // 1行目（ヘッダー）を除いて検索
      for (let i = 1; i < staffData.length; i++) {
        const sheetEmail = staffData[i][emailIndex];
        // ★★★ メールアドレス比較ログを追加 ★★★
        Logger.log('isAdmin: 行 ' + (i+1) + ' のメールアドレス=[' + sheetEmail + '] と [' + email + '] を比較'); 
        if (sheetEmail === email) { // ★厳密比較 (===) で確認
          Logger.log('isAdmin: メールアドレス一致 (行 ' + (i+1) + ')'); 
          const isAdminFlag = staffData[i][adminFlagIndex];
          Logger.log('isAdmin: 管理者フラグの値 = [' + isAdminFlag + '] (' + typeof isAdminFlag + ')'); // ★型も確認
          
          const isAdminResult = (isAdminFlag === true || String(isAdminFlag).toUpperCase() === 'TRUE' || isAdminFlag === 1);
          Logger.log('isAdmin: 判定結果 = ' + isAdminResult + ' -> ' + (isAdminResult ? 'true' : 'false')); 
          return isAdminResult;
        }
      }
      
      Logger.log('isAdmin: 一致するメールアドレスが見つかりませんでした。 -> false');
      return false; 
    } catch (e) {
      console.error('管理者判定エラー (isAdmin): ' + e);
      Logger.log('isAdmin: エラー発生 - ' + e.toString() + '\n' + e.stack); // ★スタックトレース追加
      return false; 
    }
  }
  
  /**
   * フロントエンドのJavaScriptから呼び出され、GASのログにメッセージを出力する
   * @param {string} message - ログに出力するメッセージ
   */
  function logMessage(message) {
    // GASの実行ログにメッセージを出力（[Frontend] プレフィックスを付けて区別）
    Logger.log('[Frontend] ' + message); 
  }
  
  
  // --- 他の共通ユーティリティ関数 (必要に応じて追加) ---
  /* 例：
  function formatYmd(date) { ... }
  */