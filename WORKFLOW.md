# Collect Friends App ワークフロー図解

## 🎯 アプリの概要

このアプリは、**位置情報を使って近くにいる友達と繋がれるソーシャルアプリ**です。
「今から遊べる？」「明日カフェ行こう」といった、リアルタイムな友達マッチングを実現します。

## 📱 アプリの全体構造

```mermaid
graph TB
    subgraph "フロントエンド（見た目）"
        A[アプリ起動画面]
        B[地図画面]
        C[ステータス設定画面]
        D[探索画面]
    end
    
    subgraph "バックエンド（データ管理）"
        E[Firebase/Firestore<br/>データベース]
        F[位置情報サービス]
        G[Google Maps API]
    end
    
    subgraph "主要機能"
        H[位置情報取得]
        I[ステータス管理]
        J[友達マッチング]
        K[チャット機能]
    end
    
    A --> B
    B --> C
    B --> D
    B --> H
    C --> I
    H --> F
    B --> G
    I --> E
    J --> E
    K --> E
    
    style A fill:#e3f2fd
    style B fill:#c8e6c9
    style C fill:#fff9c4
    style E fill:#ffccbc
```

## 🔄 ユーザー操作の流れ

### 1. 初回起動時の流れ

```mermaid
graph TD
    Start[アプリを開く] --> Check{位置情報の<br/>許可確認}
    Check -->|許可する| GetLoc[現在地を取得]
    Check -->|拒否| PermScreen[許可画面を表示]
    PermScreen --> Retry[再度許可を求める]
    Retry --> Check
    
    GetLoc --> ShowMap[地図を表示]
    ShowMap --> ShowUser[自分の位置に<br/>マーカーを表示]
    
    style Start fill:#e1f5fe
    style ShowMap fill:#c8e6c9
    style PermScreen fill:#ffcdd2
```

### 2. ステータス設定の流れ

```mermaid
graph TD
    MapView[地図画面] --> TapButton[ステータスボタンを<br/>タップ]
    TapButton --> Modal[設定モーダルが開く]
    
    Modal --> SetTime[いつ空いてる？<br/>・今すぐ<br/>・夕方以降<br/>・明日]
    SetTime --> SetActivity[何したい？<br/>・ご飯<br/>・カフェ<br/>・遊び<br/>・勉強]
    SetActivity --> SetRange[移動範囲<br/>・1km<br/>・3km<br/>・5km<br/>・10km]
    SetRange --> Save[保存する]
    
    Save --> UpdateMap[地図に反映]
    UpdateMap --> ShowCircle[移動範囲の<br/>円を表示]
    
    style Modal fill:#fff9c4
    style UpdateMap fill:#c8e6c9
```

### 3. 友達マッチングの流れ（今後実装予定）

```mermaid
graph TD
    UserStatus[自分のステータス<br/>設定完了] --> Search[近くの友達を検索]
    Search --> Match{マッチング条件<br/>・距離<br/>・時間<br/>・やりたいこと}
    
    Match -->|条件が合う| ShowFriends[地図に友達を表示]
    Match -->|条件が合わない| NoMatch[マッチなし]
    
    ShowFriends --> TapFriend[友達のマーカーを<br/>タップ]
    TapFriend --> ViewProfile[プロフィール表示]
    ViewProfile --> SendMessage[メッセージを送る]
    
    SendMessage --> Chat[チャット開始]
    Chat --> MakePlan[待ち合わせ決定！]
    
    style UserStatus fill:#c8e6c9
    style ShowFriends fill:#fff9c4
    style MakePlan fill:#a5d6a7
```

## 🗂️ ファイル構造の説明

```mermaid
graph TD
    Root[collect-friends-app<br/>プロジェクトルート] --> App[app/フォルダ<br/>画面ファイル]
    Root --> Components[components/フォルダ<br/>部品ファイル]
    Root --> Constants[constants/フォルダ<br/>設定ファイル]
    Root --> Hooks[hooks/フォルダ<br/>機能ファイル]
    
    App --> Tabs[(tabs)フォルダ]
    Tabs --> Index[index.tsx<br/>地図画面]
    Tabs --> Explore[explore.tsx<br/>探索画面]
    
    Components --> StatusModal[StatusModal.tsx<br/>ステータス設定]
    Components --> ThemedComponents[ThemedText.tsx<br/>ThemedView.tsx<br/>デザイン部品]
    
    style Root fill:#e3f2fd
    style App fill:#c8e6c9
    style Components fill:#fff9c4
```

## 💡 プログラミング初心者向け解説

### データの流れを理解しよう

1. **ユーザーの操作** → **画面の更新** → **データの保存**
   - 例：ステータスボタンをタップ → モーダルが開く → 設定を保存

2. **外部サービスとの連携**
   - 位置情報：スマホのGPS → アプリ → 地図に表示
   - データ保存：アプリ → Firebase → クラウドに保存

3. **コンポーネント（部品）の考え方**
   - 大きな画面を小さな部品に分割
   - 部品を組み合わせて画面を作る
   - 同じ部品を使い回せる

### 重要な用語

- **コンポーネント**: 画面を構成する部品（ボタン、テキストなど）
- **ステート（状態）**: アプリが覚えておくデータ（位置情報、ステータスなど）
- **API**: 外部サービスと通信するための窓口
- **モーダル**: 画面の上に重なって表示される小窓

## 🚀 今後の実装予定

```mermaid
graph LR
    Current[現在実装済み] --> Future[今後の機能]
    
    Current --> C1[位置情報取得]
    Current --> C2[地図表示]
    Current --> C3[ステータス設定]
    
    Future --> F1[友達システム]
    Future --> F2[リアルタイムマッチング]
    Future --> F3[チャット機能]
    Future --> F4[イベント作成]
    Future --> F5[通知機能]
    
    style Current fill:#c8e6c9
    style Future fill:#ffccbc
```

## 📝 開発のヒント

1. **まずは動くものを作る**
   - 完璧を求めすぎない
   - 小さな機能から始める

2. **ユーザー視点で考える**
   - 使いやすさを重視
   - 直感的な操作

3. **エラーに備える**
   - 位置情報が取得できない場合
   - ネットワークエラー
   - 権限がない場合

このワークフロー図を参考に、アプリの全体像を理解して開発を進めてください！