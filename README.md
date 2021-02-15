
# Generate Release Note's body based on pull requests

Release NoteのBodyをPull requestから自動生成するGithub Action

## 使い方

```yml
# deploy.yml
name: deploy

on: 
  pull_request:
    branches:
      - main
jobs:
  generate-release-notes-body:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: matsuri-tech/generate-release-notes-body-based-on-pull-requests@main
      with:
        # 必須。
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        # 任意。
        # デフォルト：'Release Note'
        # この文字列から始まるタイトルでのみ生成する
        RELEASE_PREFIX: 'Release Note'
```

## やること（処理の流れ）

1. 指定された形式のRelease Noteでのみ処理を走らせる。
2. 以前投げられたRelease Noteまで、マージされたPRのタイトルを集める。
3. 集まったPRのタイトルをconventional commitとしてパースする。
4. パースされたタイトルを元にRelease Note用のBodyを生成する。
5. 既にRelease NoteのBodyに何か記入されている場合、その下に生成されたBodyを挿入する。
6. 再度生成した場合は、以前生成されたものを置換する。

### 他にやること

- 集まったPRのBodyから`BREAKING CHANGE`からはじめる行を収集し、Release NoteのBodyにBREAKING CHANGESとしてまとめる。
- `chore` 以外のOthersにまとめられるprefixを使用したタイトルで、スコープが指定されていない場合、prefix名をスコープとして利用する。


### conventional commitについて

以下のような形式のコミットのこと。

```
prefix(scope): description
```

prefixで作業内容分類、scopeで作業箇所の分類、descriptionで作業内容の説明を表す。

詳細はconventional commitで検索すること。

## やっていないこと

- PRのタイトルに使用できるPrefixの設定

現在サポートしているPrefixは以下の通り。
```
feat
fix
build
ci
perf
test
refactor
docs
```

これ以外の指定は無視される。

- PrefixとBody生成時のタイトルマッピング

対応付けはそれぞれ以下のようになっている。

| Prefix | Heading |
| - | - |
| feat | Features |
| fix | Fixtures |
| それ以外 | Others |


## やらないこと

- CHANGELOGの生成
- tagの添付
