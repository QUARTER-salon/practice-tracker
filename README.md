# 美容師練習管理Webアプリ

## 概要　

Googleフォームで行っていた美容師（主にアシスタント）の練習記録管理を効率化するためのWebアプリケーション（Google Apps Script製）です。

## 背景と目的

現在はGoogleフォームを利用して複数店舗（4店舗）のアシスタントの練習記録を管理していますが、入力の手間（毎回名前選択など）、機能的な制約（詳細技術項目の単一選択、トレーナー選択、ウィッグ在庫管理など）、集計・分析の準備負荷といった課題がありました。

本アプリは、以下の実現により、練習記録管理の効率化と利便性向上を目指します。

*   ログイン機能による記録者特定と、名前・店舗などの自動入力
*   スタッフマスター情報との連携
*   店舗、役職、技術カテゴリーに応じた入力項目の動的表示
*   ウィッグ在庫の簡易管理機能
*   スマートフォンからの入力操作性向上
*   保守性・拡張性を考慮したデータ形式での記録収集

詳細は [要件定義書](docs/REQUIREMENTS.md) を参照してください。

## ドキュメント

*   **[要件定義書](docs/REQUIREMENTS.md):** アプリケーションの機能要件、データ要件、非機能要件などを定義しています。
*   **[開発・運用ガイド](docs/DEVELOPMENT_GUIDE.md):** ローカル開発環境のセットアップ、開発フロー（Git/clasp利用）、テスト、デプロイ、保守手順などを記載しています。**開発を進める上で必ず参照してください。**

*(注意: 上記ドキュメントファイルは `docs` ディレクトリ内に配置されている想定です)*

## 開発環境セットアップ (概要)

詳細は [開発・運用ガイド](docs/DEVELOPMENT_GUIDE.md) の「3. 開発プロジェクトの準備」セクションを参照してください。

### 前提ツール

*   [Node.js](https://nodejs.org/) (LTS推奨)
*   [Git](https://git-scm.com/)
*   [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`)
*   [VS Code](https://code.visualstudio.com/) (推奨)
*   Googleアカウント (開発権限を持つもの)

### 手順の概要

1.  **リポジトリのクローン:**
    ```bash
    # テスト用リポジトリの場合
    git clone https://github.com/your-username/practice-tracker.git
    cd practice-tracker

    # 本番用リポジトリの場合
    # git clone https://github.com/your-username/trainingwebapp.git
    # cd trainingwebapp
    ```
    *(注: `your-username` はご自身のGitHubユーザー名に置き換えてください)*

2.  **Googleアカウント認証:**
    ```bash
    clasp login
    ```

3.  **GASプロジェクトとの紐付け (`.clasp.json`):**
    *   リポジトリ直下に `.clasp.json` ファイルを作成（または `clasp clone` で自動生成されたものを編集）し、適切な `scriptId` (テスト用または本番用) を設定します。
    *   **重要:** `.clasp.json` は `.gitignore` に追加し、Git管理対象外としてください。
    ```json
    // 例: テスト用の場合
    {"scriptId":"【テスト用GASプロジェクトのスクリプトID】","rootDir":"./src"}
    ```

4.  **スプレッドシートIDの設定 (`src/Code.gs`):**
    *   `src/Code.gs` 内の `IS_PRODUCTION` フラグと `SPREADSHEET_ID` 定数を、開発環境（テスト用/本番用）に合わせて設定します。
    ```javascript
    const IS_PRODUCTION = false; // テスト環境は false, 本番環境は true
    const SPREADSHEET_ID = IS_PRODUCTION ? '【本番用スプレッドシートID】' : '【テスト用スプレッドシートID】';
    ```

5.  **コードのPush:**
    ```bash
    clasp push
    ```

## 主な技術スタック

*   **バックエンド:** Google Apps Script (JavaScriptベース)
*   **フロントエンド:** HTML, CSS, JavaScript (Google Apps Script の `HtmlService` を使用)
*   **データベース:** Google スプレッドシート
*   **開発ツール:** Visual Studio Code, Git, GitHub, clasp