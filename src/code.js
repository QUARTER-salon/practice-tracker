/**
 * 美容師練習管理Webアプリケーション
 * メインGASファイル
 * 
 * このスクリプトは美容師練習記録管理アプリケーションのバックエンドを提供します。
 * 各種Webページの提供、データの処理、スプレッドシートとの連携を行います。
 */

 // スプレッドシートIDの設定
 // ★★★ 開発中は TEST_SPREADSHEET_ID の行を有効にし、PROD_SPREADSHEET_ID の行をコメントアウト (//) します。 ★★★
 // ★★★ 本番デプロイ前には逆（PRODを有効、TESTをコメントアウト）にしてください。 ★★★ 

 // --- テスト環境用 ---
 const SPREADSHEET_ID = '1Fm6Yvl4CuHcrBBPGcLwqgvUOr2r8ifi40CtcujPChck'; // テスト練習WEBアプリ
 Logger.log('テスト環境のスプレッドシートを使用中: ID = ' + SPREADSHEET_ID); // ログで確認用

 // --- 本番環境用 ---
 // const SPREADSHEET_ID = '14YeLbX6mXYZZ5jHfF2cH-xI9V9HQ7WXrLdevGypGfn8'; // 練習WEBアプリV,1
 // Logger.log('本番環境のスプレッドシートを使用中: ID = ' + SPREADSHEET_ID); // ログで確認用

 // シート名の設定
 const STAFF_MASTER_SHEET_NAME = 'スタッフマスター';
 const PRACTICE_RECORD_SHEET_NAME = 'アプリ練習記録_RAW';
 const INVENTORY_SHEET_NAME = 'ウィッグ在庫';
 const STORE_MASTER_SHEET_NAME = '店舗マスター';
 const ROLE_MASTER_SHEET_NAME = '役職マスター';
 const TRAINER_MASTER_SHEET_NAME = 'トレーナーマスター';
 const TECH_CATEGORY_SHEET_NAME = '技術カテゴリーマスター';
 const TECH_DETAIL_SHEET_NAME = '詳細技術項目マスター'; 

/**
 * Webアプリケーションとして公開された際に呼び出される関数
 * HTTPリクエストのパスによって適切なHTMLを返す
 * 
 * @param {Object} e - イベントオブジェクト
 * @return {HtmlOutput} HTMLページ
 */
function doGet(e) {
  // URLパラメータからページ指定を取得（デフォルトはindex）
  const page = e.parameter.page || 'index';
  
  // セッション情報を確認
  const userSession = checkSession();
  
  // ページに応じたHTMLを返す
  let template;
  
  switch(page) {
    case 'app':
      // ログインチェック
      if (!userSession) {
        // ログインしていない場合はログインページにリダイレクト
        template = HtmlService.createTemplateFromFile('index');
        template.redirectMessage = 'ログインが必要です';
      } else {
        // ログイン済みの場合はアプリ画面を表示
        template = HtmlService.createTemplateFromFile('app');
        template.userInfo = userSession;
      }
      break;
      
    case 'admin':
      // 管理者権限チェック
      if (!userSession || !isAdmin(userSession.email)) {
        // 管理者でない場合はログインページにリダイレクト
        template = HtmlService.createTemplateFromFile('index');
        template.redirectMessage = '管理者権限が必要です';
      } else {
        // 管理者の場合は管理画面を表示
        template = HtmlService.createTemplateFromFile('admin');
        template.userInfo = userSession;
      }
      break;
      
    default:
      // デフォルトはログイン画面
      template = HtmlService.createTemplateFromFile('index');
      template.redirectMessage = '';
      break;
  }
  
  // HTML出力を作成して返す
  const htmlOutput = template.evaluate()
    .setTitle('美容師練習管理アプリ')
    .setFaviconUrl('https://www.example.com/favicon.ico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  
  return htmlOutput;
}

/**
 * HTMLファイルをインクルードするための関数
 * テンプレート内で <?!= include('filename'); ?> のように使用する
 * 
 * @param {string} filename - インクルードするファイル名
 * @return {string} ファイルの内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * セッションの存在を確認し、ユーザー情報を返す
 * 
 * @return {Object|null} ユーザー情報またはnull（未ログイン）
 */
function checkSession() {
  const userProperties = PropertiesService.getUserProperties();
  const sessionData = userProperties.getProperty('session');
  
  if (!sessionData) {
    return null;
  }
  
  try {
    return JSON.parse(sessionData);
  } catch (e) {
    console.error('セッションデータの解析に失敗しました: ' + e);
    return null;
  }
}

/**
 * 管理者かどうかをスタッフマスターシートのフラグで確認する
 * 
 * @param {string} email - ユーザーのメールアドレス
 * @return {boolean} 管理者であればtrue
 */
function isAdmin(email) {
  try {
    // スタッフマスターシートを取得
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = staffData[0];
    const emailIndex = headers.indexOf('メールアドレス');
    const adminFlagIndex = headers.indexOf('管理者フラグ'); // 追加した列のインデックスを取得
    
    // 必要な列が存在するかチェック
    if (emailIndex === -1 || adminFlagIndex === -1) {
      console.error('スタッフマスターシートに必要な列（メールアドレス or 管理者フラグ）がありません');
      return false; // 列がない場合は管理者ではないとする
    }
    
    // メールアドレスに一致する行を検索
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][emailIndex] === email) {
        // 管理者フラグ列の値を確認
        const isAdminFlag = staffData[i][adminFlagIndex];
        // 'TRUE' (大文字) または 1 であれば管理者とみなす
        return isAdminFlag === true || isAdminFlag === 'TRUE' || isAdminFlag === 1; 
      }
    }
    
    // メールアドレスが見つからなかった場合
    return false; 
  } catch (e) {
    console.error('管理者判定エラー: ' + e);
    return false; // エラーが発生した場合も安全のため管理者ではないとする
  }
}

/**
 * Google認証でログインする
 * 
 * @return {Object} ログイン結果とユーザー情報
 */
function loginWithGoogle() {
  try {
    // 現在ログインしているGoogleユーザーの情報を取得
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      return { success: false, message: 'Googleアカウント情報の取得に失敗しました' };
    }
    
    // スタッフマスターシートからユーザー情報を検索
    const userInfo = findUserByEmail(userEmail);
    
    if (!userInfo) {
      return { success: false, message: 'スタッフ情報が見つかりません' };
    }
    
    // セッションにユーザー情報を保存
    setSession(userInfo);
    
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
 * ID/パスワードでログインする
 * 
 * @param {string} empId - 社員番号
 * @param {string} password - パスワード
 * @return {Object} ログイン結果とユーザー情報
 */
function loginWithCredentials(empId, password) {
  try {
    if (!empId || !password) {
      return { success: false, message: '社員番号とパスワードを入力してください' };
    }
    
    // スタッフマスターシートからユーザー情報を検索
    const userInfo = findUserByEmpId(empId);
    
    if (!userInfo) {
      return { success: false, message: 'スタッフ情報が見つかりません' };
    }
    
    // パスワード検証（実際の実装では適切なハッシュ処理が必要）
    // このサンプルでは簡易的に実装
    // スタッフマスターシートにパスワードハッシュ列が必要
    if (!validatePassword(empId, password)) {
      return { success: false, message: 'パスワードが正しくありません' };
    }
    
    // セッションにユーザー情報を保存
    setSession(userInfo);
    
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
 * パスワードを検証する（サンプル実装）
 * 実際の実装では適切なハッシュ処理が必要
 * 
 * @param {string} empId - 社員番号
 * @param {string} password - パスワード
 * @return {boolean} パスワードが正しければtrue
 */
function validatePassword(empId, password) {
  try {
    // スタッフマスターシートからパスワードハッシュを取得
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号');
    const passwordIndex = headers.indexOf('パスワードハッシュ');
    
    if (empIdIndex === -1 || passwordIndex === -1) {
      console.error('スタッフマスターシートに必要な列がありません');
      return false;
    }
    
    // 社員番号に一致する行を検索
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][empIdIndex] == empId) {
        // 実際の実装ではパスワードハッシュの比較が必要
        // このサンプルでは簡易的に平文比較
        return staffData[i][passwordIndex] === password;
      }
    }
    
    return false;
  } catch (e) {
    console.error('パスワード検証エラー: ' + e);
    return false;
  }
}

/**
 * セッションにユーザー情報を保存する
 * 
 * @param {Object} userInfo - ユーザー情報
 */
function setSession(userInfo) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('session', JSON.stringify(userInfo));
}

/**
 * セッションからログアウトする
 * 
 * @return {Object} ログアウト結果
 */
function logout() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty('session');
    
    return { success: true };
  } catch (e) {
    console.error('ログアウトエラー: ' + e);
    return { success: false, message: 'ログアウト処理中にエラーが発生しました: ' + e.toString() };
  }
}

/**
 * メールアドレスからユーザー情報を検索する
 * 
 * @param {string} email - メールアドレス
 * @return {Object|null} ユーザー情報またはnull
 */
function findUserByEmail(email) {
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = staffData[0];
    const emailIndex = headers.indexOf('メールアドレス');
    
    if (emailIndex === -1) {
      console.error('スタッフマスターシートにメールアドレス列がありません');
      return null;
    }
    
    // メールアドレスに一致する行を検索
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][emailIndex] === email) {
        // ユーザー情報をオブジェクトに変換
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
          userInfo[headers[j]] = staffData[i][j];
        }
        return userInfo;
      }
    }
    
    return null;
  } catch (e) {
    console.error('ユーザー検索エラー: ' + e);
    return null;
  }
}

/**
 * 社員番号からユーザー情報を検索する
 * 
 * @param {string} empId - 社員番号
 * @return {Object|null} ユーザー情報またはnull
 */
function findUserByEmpId(empId) {
  try {
    const staffMasterSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_MASTER_SHEET_NAME);
    const staffData = staffMasterSheet.getDataRange().getValues();
    
    // ヘッダー行を取得
    const headers = staffData[0];
    const empIdIndex = headers.indexOf('社員番号');
    
    if (empIdIndex === -1) {
      console.error('スタッフマスターシートに社員番号列がありません');
      return null;
    }
    
    // 社員番号に一致する行を検索
    for (let i = 1; i < staffData.length; i++) {
      if (staffData[i][empIdIndex] == empId) {
        // ユーザー情報をオブジェクトに変換
        const userInfo = {};
        for (let j = 0; j < headers.length; j++) {
          userInfo[headers[j]] = staffData[i][j];
        }
        return userInfo;
      }
    }
    
    return null;
  } catch (e) {
    console.error('ユーザー検索エラー: ' + e);
    return null;
  }
}