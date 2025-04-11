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
 * ログイン状態とURLパラメータに応じて適切なHTMLを返す
 * 
 * @param {Object} e - イベントオブジェクト
 * @return {HtmlOutput} HTMLページ
 */
function doGet(e) {
  Logger.log('doGet: 開始, パラメータ: ' + JSON.stringify(e.parameter)); 
  
  let page = 'index'; // デフォルトはログイン画面
  let template; 
  let htmlOutput; 
  const userSession = checkSession(); // セッション情報取得 (Auth.js)
  
  // ★★★ ログイン状態フラグを確認 ★★★
  const userProps = PropertiesService.getUserProperties();
  const isLoggedIn = userProps.getProperty('loggedIn') === 'true';
  Logger.log('doGet: loggedIn フラグ確認結果 = ' + isLoggedIn);

  if (isLoggedIn && userSession) {
      // ログイン済みの場合
      Logger.log('doGet: ログイン済みと判断');
      // URLパラメータで明示的にページ指定があればそれに従う (adminなど)
      // なければデフォルトでアプリ画面 ('app') を表示
      page = e.parameter.page || 'app'; 
      Logger.log('doGet: ログイン済みのため page を "' + page + '" に設定');
  } else {
      // 未ログインの場合、またはセッション情報がない場合は強制的にログイン画面へ
      Logger.log('doGet: 未ログインと判断、page を "index" に設定');
      page = 'index';
      // もしloggedInフラグが残っていたら削除 (念のため)
      if (isLoggedIn) {
          userProps.deleteProperty('loggedIn');
          Logger.log('doGet: セッション不整合のため loggedIn フラグを削除');
      }
  }
  // ★★★ ここまで変更 ★★★

  try {
    // page 変数に基づいてテンプレートを決定
    switch(page) {
      case 'app': 
        Logger.log('doGet: app ページ処理開始 (page=' + page + ')'); 
        if (!userSession) { // isLoggedInチェック後だが念のため
          Logger.log('doGet: (app) 未ログインのため index へ'); 
          template = HtmlService.createTemplateFromFile('index');
          template.redirectMessage = 'ログインが必要です。'; 
        } else {
          Logger.log('doGet: (app) ログイン済み、app.html テンプレート作成開始'); 
          Logger.log('doGet: (app) 渡す userInfo: ' + JSON.stringify(userSession)); 
          try {
            template = HtmlService.createTemplateFromFile('app');
            template.userInfo = userSession; 
            Logger.log('doGet: (app) app.html テンプレート作成成功'); 
          } catch (templateError) {
              // ... (エラー処理) ...
              return HtmlService.createHtmlOutput('アプリ画面の読み込みに失敗しました: ' + templateError.toString())
                                .setTitle('エラー - 美容師練習管理アプリ');
          }
        }
        break;
        
      case 'admin': 
         Logger.log('doGet: admin ページ処理開始 (page=' + page + ')'); 
        const isAdminUser = userSession ? isAdmin(userSession['メールアドレス'] || userSession.email) : false; // Utils.js
        Logger.log('doGet: (admin) 管理者チェック結果 = ' + isAdminUser); 
        if (!isAdminUser) { 
          Logger.log('doGet: (admin) 管理者権限なし、index へ'); 
          // 管理者でない場合は loggedIn フラグがあっても index を表示
          template = HtmlService.createTemplateFromFile('index');
          // メッセージは状況に応じて調整
          template.redirectMessage = userSession ? '管理者権限が必要です。' : 'ログインが必要です。'; 
        } else {
           // ... (admin.html テンプレート作成処理) ...
           try {
              template = HtmlService.createTemplateFromFile('admin');
              template.userInfo = userSession; 
              Logger.log('doGet: (admin) admin.html テンプレート作成成功'); 
          } catch (adminTemplateError) {
              // ... (エラー処理) ...
              return HtmlService.createHtmlOutput('管理者画面の読み込みに失敗しました: ' + adminTemplateError.toString())
                                .setTitle('エラー - 美容師練習管理アプリ');
          }
        }
        break;
        
      default: // 'index' または page='index' の場合
         Logger.log('doGet: index ページ処理開始 (page=' + page + ')'); 
        template = HtmlService.createTemplateFromFile('index');
        template.redirectMessage = e.parameter.message || ''; 
        Logger.log('doGet: (index) index.html テンプレート作成成功'); 
        break;
    }
    
    // テンプレートを評価してHTML出力を作成
    try { 
        Logger.log('doGet: template.evaluate() 実行前 (page=' + page + ')'); 
        htmlOutput = template.evaluate()
          .setTitle('美容師練習管理アプリ')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        Logger.log('doGet: template.evaluate() 成功 (page=' + page + ')'); 
    } catch(evalError) { 
        // ... (エラー処理) ...
        htmlOutput = HtmlService.createHtmlOutput('<h1>エラー</h1><p>ページの生成中にエラーが発生しました。</p>')
                                  .setTitle('エラー - 美容師練習管理アプリ');
    } 
    
    Logger.log('doGet: 処理終了'); 
    return htmlOutput;
      
  } catch (err) {
    // ... (全体エラー処理) ...
    return HtmlService.createHtmlOutput(/* ...エラーHTML... */).setTitle(/*...*/);
  }
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
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    console.error('includeエラー (' + filename + '): ' + e);
    Logger.log('include: ファイル読み込みエラー - ' + filename + ', Error: ' + e.toString()); 
    // エラーが発生した場合は、目立つエラーメッセージを返す
    return '<p style="color: red; font-weight: bold;">Error including file: ' + filename + '. Check logs.</p>'; 
  }
}