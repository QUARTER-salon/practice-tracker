/**
 * 美容師練習管理Webアプリケーション
 * メインGASファイル
 * 
 * このスクリプトは美容師練習記録管理アプリケーションのバックエンドを提供します。
 * 各種Webページの提供、データの処理、スプレッドシートとの連携を行います。
 */

// --- 環境設定 ---
const IS_PRODUCTION = false; // ★★★ 本番デプロイ時は true に変更 ★★★

// スプレッドシートIDの設定
const PROD_SPREADSHEET_ID = '14YeLbX6mXYZZ5jHfF2cH-xI9V9HQ7WXrLdevGypGfn8'; // 本番: 練習WEBアプリV,1
const TEST_SPREADSHEET_ID = '1Fm6Yvl4CuHcrBBPGcLwqgvUOr2r8ifi40CtcujPChck'; // テスト: テスト練習WEBアプリ

const SPREADSHEET_ID = IS_PRODUCTION ? PROD_SPREADSHEET_ID : TEST_SPREADSHEET_ID;

// ログで確認用
Logger.log((IS_PRODUCTION ? '本番' : 'テスト') + '環境のスプレッドシートを使用中: ID = ' + SPREADSHEET_ID);

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
 * @param {Object} e - イベントオブジェクト (URLパラメータなどを含む)
 * @return {HtmlOutput} HTMLページ
 */
function doGet(e) {
  // URLパラメータからページ指定を取得（デフォルトはindex: ログイン画面）
  const page = e.parameter.page || 'index';
  
  // セッション情報を確認 (Auth.js の関数を呼び出す)
  const userSession = checkSession(); 
  
  let template; // HTMLテンプレートを格納する変数
  let htmlOutput; // 最終的なHTML出力を格納する変数
  
  try {
    // ページに応じたHTMLテンプレートを決定
    switch(page) {
      case 'app': // 練習記録入力画面
        // ログインチェック
        if (!userSession) {
          // 未ログイン時はログインページにリダイレクトするためのメッセージを設定
          template = HtmlService.createTemplateFromFile('index');
          template.redirectMessage = 'ログインが必要です。'; 
        } else {
          // ログイン済みの場合はアプリ画面を表示
          template = HtmlService.createTemplateFromFile('app');
          // テンプレートにユーザー情報を渡す
          template.userInfo = userSession; 
        }
        break;
        
      case 'admin': // 管理者画面
        // 管理者権限チェック (Utils.js の関数を呼び出す)
        // userSessionが存在し、かつisAdminがtrueの場合のみアクセス許可
        if (!userSession || !isAdmin(userSession['メールアドレス'] || userSession.email)) { 
          // 管理者でない場合はログインページにリダイレクトするためのメッセージを設定
          template = HtmlService.createTemplateFromFile('index');
          template.redirectMessage = '管理者権限が必要です。';
        } else {
          // 管理者の場合は管理画面を表示
          template = HtmlService.createTemplateFromFile('admin');
          // テンプレートにユーザー情報を渡す
          template.userInfo = userSession; 
        }
        break;
        
      default: // 'index' またはその他の場合 (ログイン画面)
        template = HtmlService.createTemplateFromFile('index');
        // リダイレクトメッセージは空にする (直接アクセス時)
        template.redirectMessage = e.parameter.message || ''; // URLに message パラメータがあれば表示
        break;
    }
    
    // テンプレートを評価してHTML出力を作成
    htmlOutput = template.evaluate()
      .setTitle('美容師練習管理アプリ')
      // .setFaviconUrl('https://www.example.com/favicon.ico') // 必要なら設定
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (err) {
    // テンプレート読み込みなどでエラーが発生した場合
    console.error('doGetエラー: ' + err);
    // エラーページを表示するなどのフォールバック処理
    htmlOutput = HtmlService.createHtmlOutput(
      '<h1>エラーが発生しました</h1><p>ページの読み込み中に問題が発生しました。管理者に連絡してください。</p>'
      + '<p>エラー詳細: ' + err.toString() + '</p>' // デバッグ用にエラー表示（本番では削除推奨）
      )
      .setTitle('エラー - 美容師練習管理アプリ');
  }
  
  return htmlOutput;
}

/**
 * HTMLファイルをインクルードするための関数
 * テンプレート内で <?!= include('filename'); ?> のように使用する
 * 
 * @param {string} filename - インクルードするHTMLファイル名 (拡張子なし)
 * @return {string} ファイルの内容
 */
function include(filename) {
  try {
    // 指定されたファイル名のHTMLファイルの内容を取得して返す
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    console.error('includeエラー (' + filename + '): ' + e);
    // エラーが発生した場合は、エラーメッセージを返すか、空文字を返す
    return '<p style="color: red;">Error including file: ' + filename + '</p>'; 
  }
}

// -------------------------------------------------------------------------
// 以下の関数は他のファイル (Auth.js, Utils.js など) に移動しました。
// このファイルには記述しないでください。
// -------------------------------------------------------------------------
// checkSession()
// isAdmin()
// loginWithGoogle()
// loginWithCredentials()
// validatePassword()
// setSession()
// logout()
// findUserByEmail()
// findUserByEmpId()
// -------------------------------------------------------------------------