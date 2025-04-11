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
  Logger.log('doGet: 開始, パラメータ: ' + JSON.stringify(e.parameter)); 
  let page = e.parameter.page || 'index'; // デフォルトはindex
  
  const userSession = checkSession(); // セッション取得 (Auth.js)
  
  // ★★★ セッションのリダイレクトフラグを確認・処理 ★★★
  if (userSession && userSession.redirectToApp === true) {
      Logger.log('doGet: redirectToApp フラグ検出。ページを app に強制設定。');
      page = 'app'; // ページを 'app' に強制
      
      // フラグをセッションから削除（再読み込みで意図せず app が表示されるのを防ぐ）
      delete userSession.redirectToApp; 
      setSession(userSession); // 更新されたセッションを保存 (Auth.js)
      Logger.log('doGet: redirectToApp フラグをセッションから削除しました。');
  }
  // ★★★ ここまで追加 ★★★

  let template; 
  let htmlOutput; 
  
  try {
    // page 変数に基づいてテンプレートを決定 (page は上記で上書きされている可能性あり)
    switch(page) {
      case 'app': 
        Logger.log('doGet: app ページ処理開始 (page=' + page + ')'); 
        if (!userSession) { // フラグがあってもセッション自体がなければログインへ
          Logger.log('doGet: 未ログインのため index へリダイレクト'); 
          template = HtmlService.createTemplateFromFile('index');
          template.redirectMessage = 'ログインが必要です。'; 
        } else {
          Logger.log('doGet: ログイン済み、app.html テンプレート作成開始'); 
          Logger.log('doGet: 渡す userInfo: ' + JSON.stringify(userSession)); 
          try {
            template = HtmlService.createTemplateFromFile('app');
            template.userInfo = userSession; 
            Logger.log('doGet: app.html テンプレート作成成功'); 
          } catch (templateError) {
              console.error('app.html テンプレート作成エラー: ' + templateError);
              Logger.log('doGet: app.html テンプレート作成エラー - ' + templateError.toString() + '\n' + templateError.stack); 
              return HtmlService.createHtmlOutput('アプリ画面の読み込みに失敗しました: ' + templateError.toString())
                                .setTitle('エラー - 美容師練習管理アプリ');
          }
        }
        break;
        
      case 'admin': 
         Logger.log('doGet: admin ページ処理開始'); 
        const isAdminUser = userSession ? isAdmin(userSession['メールアドレス'] || userSession.email) : false; // Utils.js の関数
        Logger.log('doGet: 管理者チェック結果 = ' + isAdminUser); 
        if (!isAdminUser) { 
          Logger.log('doGet: 管理者権限なし、index へリダイレクト'); 
          template = HtmlService.createTemplateFromFile('index');
          template.redirectMessage = '管理者権限が必要です。';
        } else {
           Logger.log('doGet: 管理者、admin.html テンプレート作成開始'); 
           Logger.log('doGet: 渡す userInfo: ' + JSON.stringify(userSession)); 
          try {
              template = HtmlService.createTemplateFromFile('admin');
              template.userInfo = userSession; 
              Logger.log('doGet: admin.html テンプレート作成成功'); 
          } catch (adminTemplateError) {
              console.error('admin.html テンプレート作成エラー: ' + adminTemplateError);
              Logger.log('doGet: admin.html テンプレート作成エラー - ' + adminTemplateError.toString() + '\n' + adminTemplateError.stack); 
              return HtmlService.createHtmlOutput('管理者画面の読み込みに失敗しました: ' + adminTemplateError.toString())
                                .setTitle('エラー - 美容師練習管理アプリ');
          }
        }
        break;
        
      default: // 'index' またはその他の場合 (ログイン画面)
         Logger.log('doGet: index ページ処理開始'); 
        template = HtmlService.createTemplateFromFile('index');
        template.redirectMessage = e.parameter.message || ''; 
        Logger.log('doGet: index.html テンプレート作成成功'); 
        break;
    }
    
    // テンプレートを評価してHTML出力を作成
    try { 
        Logger.log('doGet: template.evaluate() 実行前'); 
        htmlOutput = template.evaluate()
          .setTitle('美容師練習管理アプリ')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        Logger.log('doGet: template.evaluate() 成功'); 
    } catch(evalError) { 
        console.error('テンプレート評価エラー: ' + evalError);
        Logger.log('doGet: template.evaluate() エラー - ' + evalError.toString() + '\n' + evalError.stack); 
        htmlOutput = HtmlService.createHtmlOutput('<h1>エラー</h1><p>ページの生成中にエラーが発生しました。</p>')
                                  .setTitle('エラー - 美容師練習管理アプリ');
    } 
    
    Logger.log('doGet: 処理終了'); 
    return htmlOutput;
      
  } catch (err) {
    // doGet関数全体での予期せぬエラー
    console.error('doGet 全体エラー: ' + err);
    Logger.log('doGet: 全体エラー - ' + err.toString() + '\n' + err.stack); 
    htmlOutput = HtmlService.createHtmlOutput(
      '<h1>予期せぬエラー</h1><p>ページの読み込み中に問題が発生しました。管理者に連絡してください。</p>'
      )
      .setTitle('エラー - 美容師練習管理アプリ');
    return htmlOutput;
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