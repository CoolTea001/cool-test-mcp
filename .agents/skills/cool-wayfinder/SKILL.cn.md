---
name: cool-wayfinder
description: 把超出单次 Agent 会话处理能力的大型任务，以共享地图的形式拆解为 Issue Tracker 上的决策工单，逐个解决，直到通往目标的路径清晰可见。
disable-model-invocation: true
---

一个模糊的想法摆在面前——它太大，一次 Agent 会话装不下，前方迷雾重重：从这里到**目标**的路，现在还看不清。Wayfinding 做的就是探路，而不是闷头冲目标。它把这条路画成仓库 Issue Tracker 上的一张**共享地图**，然后逐个解决**决策工单**——工单解决的是决策，而不是要执行的一摞构建任务——直到路线明朗。

目标因任务而异，给目标起名是画地图的第一件事——它决定了每个工单的方向。目标可以是一份待交接迭代的需求文档，一个要在规划前敲定的决策，也可以是一个就地完成的改动（比如数据结构迁移）。地图不限领域——工程开发、课程内容，什么形状都装得下。

## 重在规划，而非动手

Wayfinder 默认是**规划**模式：每个工单解决一个决策，路线清晰了地图就算完成——不需要别人动手前再做决定。那种「直接开干」的冲动，通常说明你已经走到了地图的边界，该交接了。任务可以在**备注**里覆盖这一默认（把执行也纳入地图）——但如果没有说明，产出的就是决策，不是交付物。

## 用名称说话

每个地图和工单都是一个 Issue，所以它有个**标题**。凡是给人看的地方——叙述、地图的「已做决策」——都用标题来引用，绝不要只写个 ID、编号或短标签。满屏的 `#42, #43, #44` 让人眼花，标题一眼就能看懂。ID 和 URL 不是不要了——标题包着链接——但它们老老实实待在标题_里面_，不能替代标题。

## 地图

地图是仓库 Issue Tracker 上的单个 Issue，打上 `wayfinder:map` 标签——它就是规范本身。地图上的工单都是它的子 Issue。

地图是**索引**，不是仓库：它列出已做的决策，指向存有细节的工单。一个决策只放在一个地方——它的工单里——所以地图从不抄一遍，只摘要加链接。

**本仓库的 tracker 是 GitHub Issues。** 所有操作都通过克隆目录里的 `gh` CLI 完成（`owner`/`repo` 由 `git remote -v` 推断）。

### 标签

画地图**之前**，先以固定颜色创建 `wayfinder:*` 标签——通过 `gh issue create --label` 懒创建会得到随机颜色。`--force` 让命令保持幂等，所以每个地图会话前都可以重跑：

```bash
gh label create wayfinder:map        --color 00DC82 --description "The map issue" --force
gh label create wayfinder:research   --color 00DC82 --description "Research ticket (AFK)" --force
gh label create wayfinder:grilling   --color 00DC82 --description "Grilling ticket (HITL)" --force
gh label create wayfinder:prototype  --color 00DC82 --description "Prototype ticket (HITL)" --force
gh label create wayfinder:task       --color 00DC82 --description "Task ticket (HITL or AFK)" --force
gh label create wayfinder:claiming   --color 00DC82 --description "Claimed ticket (in progress)" --force
```

### 操作

- **创建地图**：一个打上 `wayfinder:map` 标签的 Issue，承载下面的正文模板。
- **创建子工单**：一个打上 `wayfinder:<type>` 标签、带问题正文的 Issue。
- **给地图添加子工单**：把每个子工单作为 sub-issue 绑定到地图上。如果 sub-issues 功能不可用，退回到在地图正文里列 task list，并在子工单正文顶部加 `Part of #<map>`。
- **添加阻塞边**：GitHub 的**原生 issue 依赖**，它会在 tracker 的 UI 上直观展示前沿。如果依赖不可用，退回到在子工单正文顶部写 `Blocked by: #<n>, #<n>` 行。一个工单当阻塞它的所有工单都关闭后，就算**解除阻塞**了。
- **前沿查询**：地图的开放子工单，去掉有任何开放阻塞方、assignee 或 `wayfinder:claiming` 标签的；按地图顺序取第一个。
- **认领**：把工单分配给主导开发者，并加上 `wayfinder:claiming` 标签——会话的第一次写入。
- **解决**：把答案作为解决评论发出来，去掉 `wayfinder:claiming` 标签，关闭 Issue，再向地图的「已做决策」**追加一条上下文指针**。

### 地图正文

整个地图以低分辨率呈现，每会话加载一次。开放的工单**不**列出来——它们是开放的子 Issue，得通过查询找到。

```markdown
## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link) — <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### 工单

每个工单是地图的一个**子 Issue**；tracker 的 issue id 就是它的身份标识。工单正文只写问题，篇幅控制在一个 100K Token 的 Agent 会话能搞定的范围内：

```markdown
## Question

<the decision or investigation this ticket resolves>
```

每个工单带一个 `wayfinder:<type>` 标签——可选 `research`、`prototype`、`grilling`、`task`（见[工单类型](#工单类型)）。

会话**认领**工单的方式，是**先**把它分配给主导地图的开发者，并加上 `wayfinder:claiming` 标签，在任何工作之前，这样并发会话就会跳过它。这个 assignee _就是_认领——标签只是让它在 tracker 的 UI 上更容易一眼扫到。开放、未分配、没有标签的工单才是还没人认领。

阻塞使用 tracker 的**原生**依赖关系——这一点至关重要，因为它在 tracker 自己的 UI 上*直观*展示前沿，人不用打开地图就知道哪些可以领。只有缺乏原生阻塞的 tracker 才退回到正文约定。一个工单当阻塞它的所有工单都关闭后，就算**解除阻塞**了；**前沿**就是开放、未阻塞、也没人认领的子工单——已知领域的边界。

答案不属于正文——解决的时候才记录（见[通过地图推进工作](#通过地图推进工作)）。解决工单时产生的附件通过链接引用，不直接贴进来。

## 工单类型

每个工单要么是 **HITL**——人在回路中，和能替自己说话的人一起干——要么是 **AFK**，由 Agent 独立驱动。HITL 工单只能通过那场实时对话解决；Agent 绝不能代替人类的那一边（一个自问自答的 grilling Agent，已经违反这条规则）。

- **Research**（AFK）：读文档、查第三方 API、翻本地知识库（如知识库文档），找出决策等待的事实。由 `/research` **subagent** 解决。当需要当前工作目录之外的知识时使用。
- **Prototype**（HITL）：做一个便宜、粗糙、具体的产物来给讨论一个抓手，提升讨论的保真度——大纲、粗略初稿、存根，或者用 /prototype 技能做 UI/逻辑代码。原型作为附件引用。当「长什么样」或「怎么表现」是关键问题时使用。
- **Grilling**（HITL）：对话。默认类型。总是调用 /grilling 和 /domain-modeling 技能。
- **Task**（HITL 或 AFK）：在做出_决策_之前必须先完成的体力活——没有要决策、原型或调研的东西，但不做完讨论就被卡住。注册服务以便评估其 API、开通访问权限、搬数据以便观察其结构。这是唯一一个_动手干_而不是做决策的类型——它的价值在于解除决策的阻塞，而不是交付目标。Agent 能自己干的就自己干（AFK）；干不了的就给人一份精确的检查清单（HITL）。活干完了就算解决；答案里记下做了什么，以及后续工单依赖的任何事实（凭据放哪儿了、新 URL、行数）。

## 战争迷雾

地图是_故意_不画全的：看不清的东西就不要画。活跃工单之外是**战争迷雾**——你能感觉到有些决策和调研迟早要来，但还吃不准，因为它们挂在还没解决的问题上。解决一个工单会扫清它前方的迷雾，把现在能确定的东西毕业成新工单——就这样一个个来，直到通往目标的道路清晰了、没有工单剩下了。

地图的**「尚未确定」**部分就是记下这片朦胧视野的地方：疑似的问题、过后要重新审视的领域。它是_朝着_目标的尚未被发现的前沿——这里的东西都在范围内，只是还不够清晰，没法建工单。写得粗还是写得细，取决于你能看到多少；它也是协作者了解任务走向的路标。

**是迷雾还是工单？** 判断标准是：**你现在能不能把问题说清楚**——不是你现在能不能回答它。

- **建工单当**：问题已经清晰——就算被阻塞暂时动不了，也可以建。
- **「尚未确定」当**：你还说不出那么清晰的表述。不要急着把迷雾预切成工单大小的碎片：它比工单更粗，一片迷雾可能毕业成好几个工单，也可能一个都没有，等前沿推进到了才知道。

**「尚未确定」** 不包括：已经定了的（已做决策）、已经是活跃工单的、超出范围的（下一节）。

## 超出范围

迷雾永远只朝着_目标_聚集。目标划定了范围，所以目标之外的工作就是**超出范围**的——它不是迷雾，也不属于**「尚未确定」**。它在地图上有自己的一块**「超出范围」**：你有意识地排除在_这个_任务之外的工作。把它放在这儿的是范围，不是清晰度。

超出范围的工作永远不会毕业——前沿在目标那里就停了——所以只有当目标被重画时它才可能回来，而且是以新任务的形式，不是恢复。

判定某个东西超出范围是**划界行为**，不是路线上的一个步骤。当一个已存在的工单恰好落在目标之外——画地图时不小心圈进来了，或者某个解答把它暴露出来了——**关闭它**（已关闭的工单明确不在前沿上；如果它被认领过，把 `wayfinder:claiming` 标签一并去掉），并在**「超出范围」**部分留一行：摘要 + 为什么超出范围 + 链接已关闭的工单。它不进入**「已做决策」**——那里记录的是实际走过的路——划界不是路上的一个步骤。

## 调用方式

两种模式。不管哪种，**每会话最多解决一个工单**——research 工单除外。

### 画地图

用户带着一个模糊想法来调用。

1. **给目标起名。** 跑一场 `/grilling` 和 `/domain-modeling` 会话，敲定这张地图要通向哪里——规格、决策还是改动。目标划定了范围，所以先把它定下来。
2. **摸清前沿。** 再追问一轮，这次**广度优先**：在整个空间铺开，而不是深钻任何一条线，把开放的决策和当下能走的第一步都摸出来。**如果这轮没探出迷雾**——通往目标的路已经明明白白，整段旅程小到一个会话装得下——你根本不需要地图。停下来问问用户想怎么办。
3. **创建地图**（打上 `wayfinder:map` 标签）：填好 Destination 和 Notes，Decisions-so-far 留空，把迷雾草图写进**「尚未确定」**。
4. **创建现在能确定的工单**作为地图的子 Issue，然后**把每个绑定为地图的 sub-issue**，并在**第二轮**连接阻塞边（Issue 得有 ID 之后才能相互引用）。连完之后，工单就分成了前沿和被阻塞两类；还确定不了的东西留在迷雾里——**「尚未确定」**一节。
5. **放出 research 子代理。** 对刚创建的每个 `research` 工单，起一个 `/research` subagent 并行解决，把发现记在一个临时的 `research/<name>` 分支上，并从工单里放一条上下文指针。
6. 停止——画地图是一个会话的事；它自己什么都不手解决。

### 通过地图推进工作

用户带着一张地图（URL 或编号）来调用。工单是**可选的**——没指定的话，你来选下一个决策，不用问用户。

1. 加载**地图**——低分辨率视图，不是每个工单的正文。
2. 选工单。用户点名了就用它。否则按顺序取第一个前沿工单。**认领它**：在任何工作之前先分配给自己，并加上 `wayfinder:claiming` 标签。
3. 解决它——**需要时放大**：按需拉取任何相关或已关闭工单的完整正文；调用 `## Notes` 里点名的技能。拿不准就用 `/grilling` 和 `/domain-modeling`。
4. 记录解决结果：把答案作为**解决评论**发出来 → 去掉 `wayfinder:claiming` 标签 → **关闭** Issue → 向地图的「已做决策」**追加一条上下文指针**。
5. 添加新冒出来的工单（先创建再连线）；把答案已经能确定的那部分迷雾毕业掉，把每块毕业的补丁从**「尚未确定」**里清掉，让它只作为新工单存在。如果答案揭示某个工单——这一个或另一个——落在了目标之外，**判定为超出范围**，不要在路线上解决它。如果决策让地图的其他部分失效了，更新或删掉那些工单。

用户可以并行跑未阻塞的工单，所以要留神其他会话也在同时编辑 tracker。
