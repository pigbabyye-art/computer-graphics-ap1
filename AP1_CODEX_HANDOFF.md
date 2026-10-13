# AP1 Codex 交付与接管说明

> 项目：计算机图形学 AP1——交互式二维分形  
> 交付对象：Codex  
> 快照日期：2026-10-13  
> 原则：**核心功能已完成并冻结。Codex 以只读审计、最终交付收口、代码讲解和有限修复为主，不进行无授权重构。**

---

## 1. 接管后的第一步：只读审计

先阅读本文和 `README.md`，然后执行：

```bash
pwd
git rev-parse --show-toplevel
git status --short
git branch --show-current
git remote -v
git log -3 --oneline --decorate
find . -maxdepth 2 -type f | sort
```

先报告：

1. 当前工作目录与 Git 根目录；
2. 当前分支、本地 HEAD、远端 HEAD；
3. 工作区是否干净；
4. 文件清单是否与本文一致；
5. 建议执行方案。

在用户确认前，不进行写操作。工作区不干净时，禁止直接执行：

```bash
git restore .
git reset --hard
git clean -fd
git pull
git rebase
git push --force
```

必须先说明差异、备份风险文件并获得确认。

---

## 2. 项目身份

### 本地路径

```text
/Users/pigbaby/我的云端硬盘/小小文件夹！/课程/专业课/专选课/计算机图形学/computer-graphics/ap1
```

Git 根目录必须是 `ap1`，不得把父目录 `computer-graphics`、`lab01-triangle` 或其他课程文件纳入仓库。

### GitHub

```text
https://github.com/pigbabyye-art/computer-graphics-ap1
```

- 分支：`main`
- 可见性：Public

### GitHub Pages

```text
https://pigbabyye-art.github.io/computer-graphics-ap1/
```

该地址已由用户实际打开并确认可运行。

### 最近确认的远端提交

```text
e2d989989590d20e9f9019f6548eabc810fdd05c
Finalize AP1 submission documentation
```

该提交只修改 `README.md` 的交付状态，没有修改运行代码。每次接管仍须重新核对 HEAD。

---

## 3. 项目目标与已实现功能

项目使用原生 WebGL 2.0 与 JavaScript，在同一画布中展示 Sierpinski 垫片。

### 两种算法

1. **混沌游戏**
   - 三角形内随机初始点；
   - 每次随机选择一个顶点；
   - `P_new = (P + V_random) / 2`；
   - 目标点数 5000～50000；
   - 使用 `gl.POINTS`。

2. **递归细分**
   - `subdivide(triangle, depth)`；
   - 深度 0～6；
   - 只递归三个角上的三角形；
   - 同一组结果支持点云、线框、实体。

### 交互与显示

- 点云 `gl.POINTS`；
- 线框 `gl.LINES`；
- 实体 `gl.TRIANGLES`；
- 点大小；
- 蓝白、橙黑、紫米白三套配色；
- 左键拖动；
- 鼠标中心缩放；
- `1 / 2 / 3` 切换模式；
- 空格暂停/继续；
- 从头播放同一批点；
- 恢复视图；
- GitHub Pages 公网部署。

用户已实际确认：三种模式、交互、动画和公网页面均正常。

---

## 4. 当前交付状态

### 已完成

- 正式入口：`index.html`；
- 兼容入口：`recursive.html`；
- 早期静态示例：`legacy-chaos.html`；
- README；
- GitHub Pages；
- 三张真实运行截图；
- 候选 ZIP 的独立解压与运行复验；
- 最终文档提交已推送远端。

### 仍需最终确认

1. 基于最终 HEAD 生成：
   ```text
   computer-graphics-ap1-final.zip
   ```
2. 记录正式 ZIP 的 SHA-256；
3. 从正式 ZIP 的全新解压目录做一次快速冒烟测试；
4. 向任课教师确认 AI 辅助代码的允许范围和引用方式；
5. 帮助用户准备现场代码抽问。

### 候选 ZIP 证据

候选包：

```text
computer-graphics-ap1-release-candidate.zip
```

候选包提交：

```text
623f35db36775eceabf0901776fccd04681f6c5f
```

候选包 SHA-256：

```text
bd314f3b597020a3dddfe684e9938769fe98b04933942a00ebf16e8910d440d3
```

该候选包已经解压并独立运行，但它不是最终提交对应的正式 ZIP，不能直接改名冒充最终包。

---

## 5. 文件结构与职责

```text
ap1/
├── .gitignore
├── .nojekyll
├── README.md
├── AP1_CODEX_HANDOFF.md
├── index.html
├── recursive.html
├── legacy-chaos.html
├── geometry.js
├── recursive-render.js
├── recursive-ui.js
├── recursive-interaction.js
├── point-growth.js
├── render.js
├── Common/
│   └── initShaders.js
└── screenshots/
    ├── 01-recursive-points.png
    ├── 02-recursive-lines.png
    └── 03-recursive-solid.png
```

| 文件 | 职责 |
|---|---|
| `index.html` | 正式入口；控件、Canvas、GLSL 着色器、脚本加载 |
| `geometry.js` | 中点、随机初始点、混沌游戏、递归细分、渲染数据转换 |
| `recursive-render.js` | WebGL 初始化、VBO、attribute/uniform、上传与绘制 |
| `recursive-ui.js` | 总调度器；算法选择、缓存、事件、状态文字、错误处理 |
| `recursive-interaction.js` | 拖动、缩放、数字键、空格、恢复视图 |
| `point-growth.js` | 只管理当前可见点数与播放状态 |
| `Common/initShaders.js` | 教材配套着色器工具，原则上不修改 |
| `legacy-chaos.html`、`render.js` | 早期静态示例，不是正式入口 |

脚本加载顺序必须保持：

```html
<script src="./Common/initShaders.js"></script>
<script src="./geometry.js"></script>
<script src="./recursive-render.js"></script>
<script src="./recursive-interaction.js"></script>
<script src="./point-growth.js"></script>
<script src="./recursive-ui.js"></script>
```

`recursive-ui.js` 依赖前面的全部模块，必须最后加载。

---

## 6. 架构与调用链

```text
index.html
    ├── 页面控件
    ├── Canvas
    └── GLSL
         ↓
recursive-ui.js
    ├── geometry.js              生成坐标
    ├── point-growth.js          计算当前可见数量
    ├── recursive-interaction.js 管理视图与快捷键
    └── recursive-render.js      上传 GPU 并绘制
```

核心表述：

> geometry 决定“画什么”，renderer 决定“怎么画”，UI 决定“何时调用”，interaction 与 growth 分别维护视图状态和动画状态。

默认链：

```text
页面加载
→ 递归深度4
→ subdivide()
→ 81个小三角形
→ buildRecursiveRenderData()
→ Float32Array
→ gl.bufferData()
→ gl.vertexAttribPointer()
→ gl.drawArrays(gl.TRIANGLES, 0, 243)
```

混沌游戏链：

```text
选择混沌游戏
→ generateChaosPoints()
→ Float32Array
→ 缓存完整点集
→ requestAnimationFrame()
→ 只增加 drawCount
→ gl.drawArrays(gl.POINTS, 0, visibleCount)
```

---

## 7. 关键不变量

### 几何

- 中点：`M=((x1+x2)/2,(y1+y2)/2)`；
- 随机初始点：`A + u(B-A) + v(C-A)`，`u+v>1` 时折回；
- 混沌游戏新点依赖上一个点；
- 递归终止：`depth === 0`；
- 叶子三角形数：`3^depth`；
- depth 4 → 81，depth 6 → 729。

### 三种绘图数据

```text
点云：A, B, C
实体：A, B, C
线框：A, B, B, C, C, A
```

深度 4：点云 243、实体 243、线框 486。这里是提交记录数，不是去重坐标数。

### WebGL

数据格式：

```text
x1,y1,x2,y2,...
```

所以：

```javascript
vertexCount = data.length / 2;
```

图元分组：POINTS=1、LINES=2、TRIANGLES=3。

`aPosition` 是逐顶点 attribute；`uPointSize`、`uColor`、`uScale`、`uTranslation` 是共享 uniform。

视图变换：

```text
P' = scale * P + translation
```

颜色、点大小、拖动和缩放不应重新生成几何。

### 缓存与模式

- `recursiveCache`：递归数据；
- `chaosCache`：随机点集；
- `active`：当前数据；
- “从头播放”只重置进度，不重新随机；
- 混沌游戏没有边/面拓扑，选择线框或实体时必须切换到递归细分。

### 动画

```text
progress = min(total, progress + rate * elapsedSeconds)
visibleCount = floor(progress)
```

按时间累计；暂停保留进度；继续时不补算暂停时间；每帧只改变 drawCount。

### 交互

坐标转换：

```text
x = 2*(mouseX-left)/width - 1
y = 1 - 2*(mouseY-top)/height
```

鼠标中心缩放：旧视图 `C=sP+T`，反求 `P=(C-T)/s`，再令 `T_new=C-s_new*P`。

---

## 8. 禁止事项

未经明确授权，不得：

1. 改写为 Three.js、React、Vue、Vite；
2. 更改算法、输入范围、动画速度或交互语义；
3. 删除兼容入口、早期示例或 `render.js`；
4. 修改仓库名、Pages URL、目录结构；
5. 修改 `Common/initShaders.js`；
6. 引入构建步骤或重做 UI；
7. 把混沌随机点随意连成线框/实体；
8. 把 ZIP 提交进仓库；
9. 上传教材、其他课程文件、私人文件或密钥；
10. force push；
11. 未备份时 hard reset、clean 或覆盖；
12. 伪造测试结果；
13. 把“代码存在”说成“真实浏览器已测试”；
14. 把 AI 辅助项目说成完全独立编写。

---

## 9. Codex 当前优先任务

### P0：核对状态

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
git log -3 --oneline
```

预期远端 HEAD：

```text
e2d989989590d20e9f9019f6548eabc810fdd05c
```

如不一致，只报告差异，不自行回退。

### P1：生成正式 ZIP

工作区干净且 HEAD 正确后：

```bash
git archive \
  --format=zip \
  --output="../computer-graphics-ap1-final.zip" \
  HEAD

unzip -t ../computer-graphics-ap1-final.zip
unzip -l ../computer-graphics-ap1-final.zip
shasum -a 256 ../computer-graphics-ap1-final.zip
```

ZIP 不得包含 `.git/`、`test.html`、验收清单、`lab01-triangle/`、教材、课程说明书、密钥或其他课程文件。

### P2：正式 ZIP 冒烟测试

```bash
rm -rf ../ap1-final-test
mkdir ../ap1-final-test
unzip -q ../computer-graphics-ap1-final.zip -d ../ap1-final-test
cd ../ap1-final-test
python3 -m http.server 8003 --bind 127.0.0.1
```

人工确认：根地址进入完整应用；默认实体正常；三种模式可切换；混沌游戏可播放；空格可暂停/继续；鼠标交互正常；Console 无红色错误；README 和三张截图存在。

### P3：代码教学

讲解必须从调用链出发，指向具体文件与函数，解释数据结构和设计原因，并给出用户可复述的口语版本。顺序：

```text
整体架构
→ index.html与着色器
→ geometry.js
→ recursive-render.js
→ recursive-ui.js
→ recursive-interaction.js
→ point-growth.js
→ 完整调用链
→ 答辩模拟
```

---

## 10. 验收矩阵

- 几何：depth 0→1、1→3、2→9、4→81、6→729；
- 深度4：点云243、线框486、实体243；
- 混沌游戏：5000、10000；重新生成改变坐标，重播不改变坐标；
- 无效输入：4999、50001、小数、空值应被拒绝；
- 交互：拖动、鼠标中心缩放、数字键、空格、恢复视图；
- 动画：从0开始、暂停保持、继续不补算、完成封顶、后台暂停；
- 公网：根地址进入完整应用，脚本和截图均可加载，Console 无红色错误。

---

## 11. Codex 工作报告格式

```markdown
# AP1 工作报告
## 1. 任务范围
## 2. 初始状态
## 3. 检查或改动
## 4. 实际执行命令
## 5. 验证结果
## 6. 证据（提交号、ZIP、SHA、日志）
## 7. 风险与边界
## 8. 用户需要掌握的知识
## 9. 下一步
```

验证结果必须区分静态检查、自动检查、本地服务器、真实浏览器人工检查和未执行项。不得只回复“已完成”。

---

## 12. 可直接发送给 Codex 的启动指令

```text
请先读取项目根目录中的 AP1_CODEX_HANDOFF.md 和 README.md。

项目是计算机图形学 AP1：原生 WebGL 2.0 交互式 Sierpinski 分形。核心功能已经完成并冻结。你的角色是：
1. 先做只读状态审计；
2. 不擅自重构或增加功能；
3. 优先完成最终 ZIP、校验与独立解压冒烟测试；
4. 保留两种算法、三种模式、交互语义和文件结构；
5. 写操作前先报告 git 状态与拟修改范围；
6. 不使用 force push、hard reset 或 clean；
7. 输出完整工作报告，并解释关键代码，帮助我准备抽问。

先执行，不要修改文件：
pwd
git rev-parse --show-toplevel
git status --short
git branch --show-current
git remote -v
git log -3 --oneline --decorate
find . -maxdepth 2 -type f | sort

报告当前状态、与交付文档是否一致、下一步建议，然后等待确认。
```

---

## 13. 用户必须能讲清的五个问题

1. 为什么递归深度 `d` 对应 `3^d` 个三角形？
2. 为什么线框数据是 `A,B,B,C,C,A`？
3. 为什么二维顶点数是 `data.length / 2`？
4. 为什么动画只改变 drawCount，而不每帧重新随机？
5. 为什么鼠标中心缩放还要同步调整平移量？

---

## 14. 最终交付信息

```text
公网运行地址：
https://pigbabyye-art.github.io/computer-graphics-ap1/

源码仓库：
https://github.com/pigbabyye-art/computer-graphics-ap1

预期最终源码包：
computer-graphics-ap1-final.zip

最近确认的最终文档提交：
e2d989989590d20e9f9019f6548eabc810fdd05c
```

事实边界：未实现 E1/E2/E3；只实际使用 `Common/initShaders.js`；正式最终 ZIP 的 SHA-256 尚需生成并记录；AI 辅助说明必须如实保留。