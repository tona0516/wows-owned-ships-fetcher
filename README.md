# wows-owned-ships-fetcher

## 概要
指定したクランに属するメンバーの所持艦艇リストをcsvファイルで出力します。

## 使い方
[Node.js](https://nodejs.org/en)と[アプリケーションID](https://developers.wargaming.net/)が必要です。

```
$ npm ci
$ npm run fetch -- <アプリケーションID> -- <クラン名>
```

## 実行例
```
$ npm run fetch -- e433c89bb59d297f1d545144a879e77d -- -K2-

> wows-owned-ships-fetcher@1.0.0 fetch
> ts-node index.ts e433c89bb59d297f1d545144a879e77d -- -K2-

shiplist_-K2-_20231213.csvへの出力に成功しました！
~/GitHub/wows-owned-ships-fetcher main ☸minikube

$ cat shiplist_-K2-_20231213.csv | head
,MTDroine,gaku0083,tonango,myouko02,kawachan134_2022,Orca_0313
I Gryf,◯,,◯,,,
I Bougainville,,,◯,,,
I Hermelin,◯,,◯,,◯,◯
I Eritrea,,,,,,◯
I 橋立,◯,◯,◯,◯,◯,
I Van Kinsbergen,,,,,,
I Hércules,,,,,,
I Chengan,◯,,,,,
I Júpiter,,,,,,
```

## 仕様
- 厳密には所持艦艇ではなく「ランダム1戦以上の艦艇」に◯がついています
- Tier,艦種,国籍,艦IDの順でソートしています
- 貸与艦は除外しています
- クランメンバーが多い場合は数分かかることがあります
