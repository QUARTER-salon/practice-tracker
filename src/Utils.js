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
    return isAdmin(userEmail);
  }
  
  /**
   * 指定されたメールアドレスが管理者権限を持つか、スタッフマスターシートで確認する
   * 
   * @param {string} email - 確認するユーザーのメールアドレス
   * @return {boolean} 管理者であればtrue、そうでなければfalse
   */
  function isAdmin(email) {
    // メールアドレスが渡されていない場合は管理者ではない
    if (!email) {
      Logger.log('isAdmin: メールアドレスが指定されていません。');
      return false; 
    }
    
    try {
      // スタッフマスターシートを取得
      const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
      const staffData = staffMasterSheet.getDataRange().getValues();
      
      // ヘッダー行から列インデックスを取得
      const headers = staffData[0];
      const emailIndex = headers.indexOf('メールアドレス'); // 列名を確認
      const adminFlagIndex = headers.indexOf('管理者フラグ'); // 列名を確認
      
      // 必要な列が存在するかチェック
      if (emailIndex === -1 || adminFlagIndex === -1) {
        console.error('スタッフマスターシートに必要な列（メールアドレス or 管理者フラグ）がありません。');
        Logger.log('isAdmin: スタッフマスターシートに必要な列が見つかりません。');
        return false; // 列がなければ判定不可
      }
      
      // 1行目（ヘッダー）を除いて検索
      for (let i = 1; i < staffData.length; i++) {
        // メールアドレスが一致するか確認
        if (staffData[i][emailIndex] === email) {
          // 見つかったユーザーの管理者フラグの値を取得
          const isAdminFlag = staffData[i][adminFlagIndex];
          
          // 管理者フラグが TRUE (ブール値)、'TRUE' (大文字文字列)、または 1 (数値) のいずれかであれば管理者とみなす
          const isAdminResult = (isAdminFlag === true || String(isAdminFlag).toUpperCase() === 'TRUE' || isAdminFlag === 1);
          // Logger.log('isAdmin: ' + email + ' の管理者フラグ = ' + isAdminFlag + ', 結果 = ' + isAdminResult); // デバッグ用ログ
          return isAdminResult;
        }
      }
      
      // ループを抜けた場合 = メールアドレスが見つからなかった
      Logger.log('isAdmin: メールアドレス ' + email + ' がスタッフマスターに見つかりません。');
      return false; 
    } catch (e) {
      console.error('管理者判定エラー (isAdmin): ' + e);
      Logger.log('isAdmin: エラー発生 - ' + e.toString());
      return false; // エラー発生時も安全のため管理者ではないとする
    }
  }
  
  // --- 他の共通ユーティリティ関数 (必要に応じて追加) ---
  
  /* 例：
  function logError(functionName, error) {
    console.error('[' + functionName + '] エラー: ' + error);
    // 必要であれば Stackdriver Logging にも送信
  }
  
  function formatYmd(date) {
    if (!date) return '';
    const d = new Date(date);
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  */