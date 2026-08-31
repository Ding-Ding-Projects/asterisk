# Public record drafts for the 2026-08-31 release closeout

> Draft only. Do not post these sections until the final runtime, built-artifact interaction,
> capture, and design-parity evidence is observed. The wording is public-safe and intentionally
> makes no claim beyond the records cited below.

## Issue #1, start comment draft

### English

#### 🚀 In progress

Started: `2026-08-31T00:00:00-04:00` (replace with the actual start timestamp before posting).
The documentation and records lane is refreshing `README.md`, `ROADMAP.md`, `HANDOFF.md`, the
categorized feature indexes, and the current public record drafts. The lane is on
`yum-tong/docs` at `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`. It changes only documentation and
reports only documentation and link checks. Runtime interaction and current capture evidence
remain pending in the owning lanes.

### 粵語

#### 🚀 進行中

開始時間：`2026-08-31T00:00:00-04:00`（發佈前請換成真實開始時間）。文件同紀錄 lane 更新
`README.md`、`ROADMAP.md`、`HANDOFF.md`、分類文件索引，同埋公開紀錄草稿。工作喺
`yum-tong/docs`，候選 source commit 係 `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`。
呢條 lane 只改文件，同埋只報告文件同連結檢查；Runtime interaction 同最新 capture 證據
仍然等緊負責 lane。

## Issue #1, milestone comment draft

### English

#### 🔄 Documentation milestone

`refs/heads/main` reads back to `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`. Releases
`ding-pbx-console-v0.0.300-r1` and `ding-pbx-installer-iso-v0.0.7-r1` are non-draft records
targeting that SHA. Console, ISO, and Pages runs `33210571775`, `33210571840`, and `33210571949`
completed successfully. Delivery runs do not execute tests or lint, so issue #1 remains open until
the remaining runtime, built-artifact, capture, and parity evidence is observed.

### 粵語

#### 🔄 文件里程碑

`refs/heads/main` 讀返係 `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`。Console release、ISO
release 都係 non-draft，指向同一個 SHA。Console、ISO 同 Pages run
`33210571775`、`33210571840`、`33210571949` 已經成功完成。Delivery run 唔會跑 tests 或
lint，所以 #1 要等其餘 runtime、built-artifact、capture 同 parity 證據出現先再處理。

## Issue #1, finished comment draft

### English

#### ✅ Finished

Finished: `2026-08-31T00:00:00-04:00` (replace with the actual finish timestamp and elapsed
duration before posting). Insert the exact documentation commit, changed-file list, check counts,
link-check output, and push state from the final observed run. Do not post this as completion while
runtime or current built-artifact evidence is pending.

### 粵語

#### ✅ 完成

完成時間：`2026-08-31T00:00:00-04:00`（發佈前請換成真實完成時間同 elapsed duration）。
發佈前要由最後一次真實 run 補返 exact commit、改動檔案、check 數目、link-check output 同
push 狀態。Runtime 或最新 built-artifact 證據未齊之前唔可以當完成留言發出。

## Issue #6 disposition draft

### English

#### ⏸️ Still open

Issue #6 remains open. This record does not claim that its apply-and-undo repair is integrated into
`main`, or that built-artifact interaction and final capture proof are complete. Keep it open until
those exact records are read back from the default branch.

### 粵語

#### ⏸️ 仍然開住

Issue #6 繼續 open。今次紀錄冇聲稱 apply-and-undo 修補已經合入 `main`，亦冇聲稱
built-artifact interaction 同最後 capture 證據完成。要等 default branch 讀返嗰啲 exact records
先再處理。

## Rolling Discussion #2 draft

### English

#### 📌 Current status

Current source is `main` at `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`. Published releases and
the Pages run target that SHA and were read back successfully. The documentation lane is separate.
No local test, current UI drive, capture, or design-parity verdict is claimed here.

### 粵語

#### 📌 最新狀態

目前 source 係 `main` 嘅 `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`。Published release 同
Pages run 都指向呢個 SHA，亦已讀返確認成功。文件 lane 係獨立處理，未有聲稱 local test、
最新 UI drive、capture 或 design-parity verdict。

## Per-release Announcement draft

### English

#### 📦 ding-pbx-console-v0.0.300-r1

This release targets `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`. It contains the unsigned
Squirrel.Windows installer, `RELEASES`, full `.nupkg`, update metadata, checksums, line-count and
WSL runtime records, and the dim-sum image asset. Code name: **Yellow Sugar Sponge Cake · 黃糖糕**.
Workflow duration: `00:16:24`. GitHub Actions did not run tests or lint. Windows may show an
unknown-publisher or SmartScreen warning because the installer is unsigned.

Release: https://github.com/Ding-Ding-Projects/material-asterisk/releases/tag/ding-pbx-console-v0.0.300-r1

### 粵語

#### 📦 ding-pbx-console-v0.0.300-r1

呢個 release 指向 `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`，包括 unsigned Squirrel.Windows
installer、`RELEASES`、完整 `.nupkg`、metadata、checksums、line-count、WSL runtime 紀錄同
dim-sum 圖片。Code name 係 **Yellow Sugar Sponge Cake · 黃糖糕**，workflow 用時 `00:16:24`。
GitHub Actions 冇跑 tests 或 lint。Installer 冇簽名，Windows 可能顯示 unknown-publisher 或
SmartScreen warning。

## Project #24 draft

### English

#### 📋 Status update

Keep item #24 evidence-pending until final local and built-artifact records are attached. The
published release and Pages deployment are successful for the current SHA, but that does not
substitute for UI and design-parity proof.

### 粵語

#### 📋 狀態更新

Item #24 要保持 evidence-pending，直到最後 local 同 built-artifact 紀錄附上。Published
release 同 Pages deployment 對目前 SHA 係成功，但唔可以代替 UI 同 design-parity 證據。

## Wiki draft

### English

#### Documentation and release status

The maintained documentation points to `Ding-Ding-Projects/material-asterisk` and
`https://ding-ding-projects.github.io/material-asterisk/`. The latest console release is
`ding-pbx-console-v0.0.300-r1`; the installer ISO release is
`ding-pbx-installer-iso-v0.0.7-r1`. Both target
`7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60` and are unsigned. Automated delivery publishes build
evidence but does not run tests or lint. Runtime, current capture, and parity evidence remain
separately tracked until observed.

### 粵語

#### 文件同 release 狀態

維護緊嘅文件指向 `Ding-Ding-Projects/material-asterisk` 同
`https://ding-ding-projects.github.io/material-asterisk/`。最新 console release 係
`ding-pbx-console-v0.0.300-r1`，ISO release 係 `ding-pbx-installer-iso-v0.0.7-r1`，兩個都
指向 `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60`，而且都係 unsigned。Automated delivery 會
附上 build evidence，但唔會跑 tests 或 lint。Runtime、最新 capture 同 parity evidence 要
等真實結果先可以記錄。

## Publication checklist

- [ ] Replace placeholder timestamps with the actual observed start and finish times.
- [ ] Insert the exact documentation commit and link-check output.
- [ ] Insert runtime, current built-artifact, capture, and design-parity evidence only after they exist.
- [ ] Read every posted surface back after publication.
- [ ] Do not post this draft before the evidence boundary is closed.
