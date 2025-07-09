
# Generate Release Note's body based on pull requests

Release NoteのBodyをPull requestから自動生成するGithub Action

<img src="https://user-images.githubusercontent.com/30747709/108146634-dc0a2580-7110-11eb-90d0-10ab2e441b40.png" width="500px"/>

## 使い方

```yml
## .github/deploy.yml
name: deploy

on: 
  pull_request:
# 走るリポジトリを制限したい場合は次のような記述を追加する。ただし、PRのタイトルがフォーマットにしたがっていない場合は即処理が中断するため、制限する意味はさほどない。
#    branches:
#      - ここにPR先のリポジトリ名を入れる
jobs:
  generate-release-notes-body:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: matsuri-tech/generate-release-notes-body-based-on-pull-requests@v2
      with:
        # 必須。
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        # 任意。
        # デフォルト：'Release Note'
        # この文字列から始まるタイトルでのみ生成する
        RELEASE_PREFIX: 'Release Note'
        # 任意。
        # パスフィルター：指定したパスの変更を含むPRのみを対象にする
        # カンマ区切りで複数指定可能。monorepo構成で特定のパッケージのみのリリースノートを生成したい場合に有用
        # 例: 'packages/core/,packages/utils/'
        PATH_FILTER: ''
```

## やること（処理の流れ）

1. 指定された形式のRelease Noteでのみ処理を走らせる。
2. 以前投げられたRelease Noteまで、マージされたPRのタイトルを集める。
3. PATH_FILTERが指定されている場合、各PRの変更ファイルを取得し、指定されたパスにマッチするPRのみを対象にする。
4. 集まったPRのタイトルをconventional commitとしてパースする。
5. パースされたタイトルを元にRelease Note用のBodyを生成する。
6. 既にRelease NoteのBodyに何か記入されている場合、その下に生成されたBodyを挿入する。
7. 再度生成した場合は、以前生成されたものを置換する。

### 他にやること

- 集まったPRのBodyから`BREAKING CHANGE`からはじめる行を収集し、Release NoteのBodyにBREAKING CHANGESとしてまとめる。
- `chore` 以外のOthersにまとめられるprefixを使用したタイトルで、スコープが指定されていない場合、prefix名をスコープとして利用する。

### パスフィルタ機能

PATH_FILTERパラメータを使用することで、特定のパス内の変更を含むPRのみをリリースノートの対象にすることができます。これはmonorepo構成で特定のパッケージやライブラリのみのリリースノートを生成したい場合に有用です。

- カンマ区切りで複数のパスパターンを指定可能
- パスの前方一致で判定
- 例: `packages/core/,packages/utils/` → core パッケージと utils パッケージの変更のみ対象
- 未指定の場合は全てのPRが対象（従来の動作）


### conventional commitについて

以下のような形式のコミットのこと。

```
prefix(scope): description
```

prefixで作業内容分類、scopeで作業箇所の分類、descriptionで作業内容の説明を表す。

詳細はconventional commitで検索すること。

## Release PullRequestの作り方

PullRequestのタイトルが、RELEASE_PREFIX（デフォルトではRelase Note）にマッチすれば、Release PullRequestとして判定されます。

フォーマットが決まっているのであれば、Github CLIを使うと便利です。以下のようにワンライナーでいけます。

```command
gh pr create --base deploy --head master --title "Release Note: $(date '+%Y/%m/%d')" --body "" --reviewer [REVIEWER_NAME]
```

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
