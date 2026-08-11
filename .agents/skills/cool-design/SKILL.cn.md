---
name: cool-design
description: 项目专属前端设计技能，基于 Nuxt UI 与 Tailwind CSS v4 设计系统，融合设计约束与通用设计方法论。所有 UI 实现与页面设计任务都应使用。深色模式为默认主题。
brand:
  green: "#00DC82"
  navy: "#020420"
  white: "#FFFFFF"
theme:
  font-sans: "'Public Sans', sans-serif"
  color-green-50: "#EFFDF5"
  color-green-100: "#D9FBE8"
  color-green-200: "#B3F5D1"
  color-green-300: "#75EDAE"
  color-green-400: "#00DC82"
  color-green-500: "#00C16A"
  color-green-600: "#00A155"
  color-green-700: "#007F45"
  color-green-800: "#016538"
  color-green-900: "#0A5331"
  color-green-950: "#052E16"
semantic-colors:
  primary: green
  neutral: slate
  important: violet
  secondary: blue
  success: green
  info: blue
  warning: yellow
  error: red
css-variables:
  ui-container: 90rem
  ui-header-height: 112px
  ui-bg-dark: "var(--ui-color-neutral-950)"
  ui-bg-muted-dark: "var(--ui-color-neutral-900)"
  ui-bg-elevated-dark: "var(--ui-color-neutral-900)"
  ui-bg-accented-dark: "var(--ui-color-neutral-800)"
text:
  dimmed: "text-dimmed"
  muted: "text-muted"
  toned: "text-toned"
  default: "text-default"
  highlighted: "text-highlighted"
  inverted: "text-inverted"
background:
  default: "bg-default"
  muted: "bg-muted"
  elevated: "bg-elevated"
  accented: "bg-accented"
  inverted: "bg-inverted"
border:
  default: "border-default"
  muted: "border-muted"
  accented: "border-accented"
  inverted: "border-inverted"
radius:
  base: "var(--ui-radius)"
  utilities: [xs, sm, md, lg, xl, 2xl, 3xl]
components:
  button-primary: 'UButton color="primary"'
  button-secondary: 'UButton color="neutral" variant="subtle"'
  button-ghost: 'UButton variant="ghost"'
  button-error: 'UButton color="error"'
  input: 'UInput'
  container: 'UContainer'
  page-hero: 'UPageHero'
  prose: 'prose prose-primary dark:prose-invert'
---

# Nuxt

## 总览

Nuxt 是 Nuxt 产品与沟通的设计语言。美学取向是开发者导向、自信笃定：深邃的藏青底色，Nuxt 绿作为唯一强调色，加上慷慨的留白。优先考虑可读性、可访问性与清晰度，而非装饰。颜色用来传达状态或层级，不是用来填满空间。

这套体系由 [Nuxt UI](https://ui.nuxt.com) 和 **Tailwind CSS v4** 驱动，**CSS 变量**作为设计令牌。颜色是语义化的（`primary`、`neutral`、`error`…），而不是组件里写死的十六进制值。深色模式是默认主题。

Logo 素材与可下载的品牌文件在 [/design-kit](/design-kit)。

## Tailwind CSS

主题令牌用 `@theme` 指令定义：

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: 'Public Sans', sans-serif;
  --color-green-50: #EFFDF5;
  /* … green-100 through green-950 … */
  --color-green-400: #00DC82;
}

:root {
  --ui-container: 90rem;
}

.dark {
  --ui-bg: var(--ui-color-neutral-950);
  --ui-bg-muted: var(--ui-color-neutral-900);
  --ui-bg-elevated: var(--ui-color-neutral-900);
  --ui-bg-accented: var(--ui-color-neutral-800);
}
```

完整的 `@theme` 定制选项见 [Nuxt UI 设计系统文档](https://ui.nuxt.com/docs/getting-started/theme/design-system)。

## 品牌色

这些是 Nuxt 的市场营销色，与 Nuxt UI 的语义令牌不同：

| 名称 | Hex | 用途 |
|------|-----|-------|
| 绿 Green | `#00DC82` | Logo、品牌强调色。映射到 `@theme` 中的 `green-400`。 |
| 藏青 Navy | `#020420` | 深色背景、OG 图片、`theme-color` meta。 |
| 白 White | `#FFFFFF` | 深色表面上的文字、浅色 Logo 变体。 |

完整的绿色色阶（`green-50`–`green-950`）定义在 `@theme static` 中，支撑 `primary` 语义色。

## 语义色

Nuxt UI 通过运行时配置把语义别名映射到 Tailwind 色阶：

| 语义 | 映射到 | 用途 |
|----------|---------|-------|
| `primary` | `green` | CTA、链接、激活导航、品牌元素 |
| `neutral` | `slate` | 文字、边框、背景、禁用状态 |
| `important` | `violet` | 高亮徽标与强调 |
| `secondary` | `blue`（默认） | 次级操作 |
| `success` | `green`（默认） | 成功状态 |
| `info` | `blue`（默认） | 信息提示、工具提示 |
| `warning` | `yellow`（默认） | 警告、待处理状态 |
| `error` | `red`（默认） | 错误、破坏性操作 |

在 Nuxt UI 组件上使用 `color` prop：

```vue
<UButton color="primary">Get Started</UButton>
<UButton color="neutral" variant="subtle">Learn More</UButton>
<UButton color="error">Delete</UButton>
```

注册的主题色：`primary`、`secondary`、`info`、`success`、`warning`、`error`、`important`。

## CSS 变量

Nuxt UI 提供了由 `--ui-*` CSS 变量支撑的语义化工具类。见 [CSS 变量文档](https://ui.nuxt.com/docs/getting-started/theme/css-variables)。

### 颜色工具类

`text-primary`、`bg-success`、`border-error` 等——每个都解析到映射色阶的某个明度。浅色模式用 `-500`，深色模式用 `-400`。

### 文字层级

| Class | 角色 |
|-------|------|
| `text-dimmed` | 禁用、占位符 |
| `text-muted` | 次要文字、说明文字 |
| `text-toned` | 三级文字 |
| `text-default` | 正文 |
| `text-highlighted` | 标题、强调 |
| `text-inverted` | 反色背景上的文字 |

### 背景层级

| Class | 角色 |
|-------|------|
| `bg-default` | 页面表面 |
| `bg-muted` | 细微填充、分组内容 |
| `bg-elevated` | 卡片、浮层 |
| `bg-accented` | 悬停状态、激活面板 |
| `bg-inverted` | 反色表面 |

深色主题把 `--ui-bg` 覆盖为 `neutral-950`（比 Nuxt UI 默认的 `neutral-900` 更深），营造接近藏青的观感。

### 边框层级

| Class | 角色 |
|-------|------|
| `border-default` | 标准边框 |
| `border-muted` | 细微分隔线 |
| `border-accented` | 强调边框 |
| `border-inverted` | 反色表面上的边框 |

卡片和模块通常用 `bg-elevated` 或 `bg-muted` 上的 `border border-default`。

## 排版

**字体：** Public Sans（`--font-sans`），通过 `@nuxt/fonts` 加载。

Nuxt UI 不像专业设计系统那样内置固定字号阶梯。使用 Tailwind 工具类：

| 场景 | 典型类名 |
|---------|----------------|
| 页首 Hero | `text-5xl sm:text-7xl font-semibold` |
| 区块 Hero | `sm:text-5xl font-semibold` |
| 区块标题 | `text-2xl`–`text-4xl font-semibold` |
| 正文 / 散文 | `prose prose-primary dark:prose-invert` |
| UI 标签 | `text-sm`、`text-xs` |
| 代码 | `font-mono`、Shiki 高亮块 |

优先使用语义化文字类（`text-highlighted`、`text-muted`），而不是裸 slate 颜色。

## 布局

### 容器

`--ui-container: 90rem`——由 `UContainer` 使用。

### 页头

大屏下 `--ui-header-height: 112px`，用于文档与营销布局。

### 间距

使用 Tailwind 默认的 4px 基数间距。常见节奏：

- `gap-2` / `p-2`（8px）——组内
- `gap-4` / `p-4`（16px）——相关条目之间
- `py-10 sm:py-20`——区块内边距
- `py-24 sm:py-32 lg:py-40`——Hero 区块

### 断点

Tailwind 默认：`sm` 640px、`md` 768px、`lg` 1024px、`xl` 1280px、`2xl` 1536px。

## 圆角

Nuxt UI 的所有 `rounded-*` 工具类都源自同一个 `--ui-radius` 基数（默认 `0.25rem`）。可用：`rounded-xs`、`rounded-sm`、`rounded-md`、`rounded-lg`、`rounded-xl`、`rounded-2xl`、`rounded-3xl`。

卡片和控件通常用 `rounded-lg` 或 `rounded-md`。Hero 面板可以用 `rounded-2xl`。

## 组件

使用 Nuxt UI 原语——不要重新造已存在的东西：

| 模式 | 组件 | 示例 |
|---------|-----------|---------|
| 主要操作 | `UButton` | `<UButton color="primary">Deploy</UButton>` |
| 次要操作 | `UButton` | `<UButton color="neutral" variant="subtle">Cancel</UButton>` |
| 三级 / 链接 | `UButton` | `<UButton variant="ghost">Docs</UButton>` |
| 破坏性操作 | `UButton` | `<UButton color="error">Delete</UButton>` |
| 表单输入 | `UInput` | `<UInput placeholder="Search modules" />` |
| 页面布局 | `UPage`、`UPageHero`、`UPageBody` | 营销与文档页 |
| 内容 | `ContentRenderer` + prose | Markdown/MDC 内容 |
| 导航 | `UHeader`、`UNavigationMenu` | 应用页头 |

焦点环由 Nuxt UI 处理（`:focus-visible` 上的 `outline-primary/25`）。不要在没有可见替代方案的情况下移除轮廓。

## 动效

克制地使用动效。尊重 `prefers-reduced-motion`。Nuxt UI 组件对模态框、浮层和菜单内置了合理的默认过渡。

## 语气与文案

- 标签、按钮、标题和页签用 Title Case；正文和辅助文字用句子式写法。
- 操作命名用动词 + 名词（`Deploy Project`、`Install Module`）。
- 错误文案写成「发生了什么 + 接下来怎么做」。
- Toast 点名具体变化的对象——不加句号，不用「successfully」。
- 空状态指向第一个操作。
- 进行中状态用现在分词 + 省略号：`Deploying…`。

## 该做与不该做

- 用语义化颜色 prop（`color="primary"`）和工具类（`text-muted`、`bg-elevated`）——而不是组件里的裸 hex。
- 视图上的主 CTA 用绿色 `primary` 色。
- 文字按 `text-highlighted` > `text-default` > `text-muted` > `text-dimmed` 排序。
- 保持 WCAG AA 对比度（正文 4.5:1）。
- 不要只靠颜色传达状态；配上图标或标签。
- 不要在 UI 代码里写死 `#00DC82`——用 `text-primary` 或 `color="primary"`。
- 不要在没有山形符号的情况下使用字标——见 [/design-kit](/design-kit)。

## 资源

- 品牌素材（Logo、图标）：[/design-kit](/design-kit)
- Figma 品牌套件：[Nuxt Brand Kit](https://www.figma.com/community/file/1296154408275753939/nuxt-brand-kit)
- Nuxt UI 设计系统：[ui.nuxt.com/docs/getting-started/theme/design-system](https://ui.nuxt.com/docs/getting-started/theme/design-system)
- Nuxt UI CSS 变量：[ui.nuxt.com/docs/getting-started/theme/css-variables](https://ui.nuxt.com/docs/getting-started/theme/css-variables)
