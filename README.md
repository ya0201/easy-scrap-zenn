# Easy Scrap Zenn

現在開いているページ情報をもとに、Zenn Scrap に直接遷移して追記下書きを自動入力する Chrome Extension。

## できること

- ショートカットまたは拡張アイコン押下で現在タブの情報を取得し、保存済み Scrap を直接開く
  - タイトル
  - URL
  - 選択テキスト（あれば）
- 開いた Scrap ページの入力欄へ下書きを自動投入

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択

## 使い方

1. 拡張機能のオプションで Scrap URL を保存  
   例: `https://zenn.dev/{user}/scraps/{id}`
2. 任意ページでショートカットを押す（または拡張アイコンをクリック）
3. 開いた Scrap ページで内容を追記して送信

## ショートカット

- 初期値: `Ctrl+Shift+L` (`macOS` は `Command+Shift+L`)
- 変更方法: `chrome://extensions/shortcuts`

注意: ブラウザ予約ショートカットは拡張機能側で奪えないため、設定できない場合がある
