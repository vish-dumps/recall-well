# Dashboard Layout Tuning Guide

This guide helps you fine-tune the Home Dashboard layout in `src/pages/DashboardPage.tsx`.

## 1) Header Position + Size (Welcome / User Name)

Edit this block:

```tsx
<div className="pt-2">
  <p className="text-sm text-muted-foreground">Welcome</p>
  <h1 className="mt-4 text-6xl md:text-7xl xl:text-8xl font-display leading-[0.95] text-foreground">
    {displayName}
  </h1>
</div>
```

- Move header down/up: change `pt-2` and `mt-4`
- Make user name larger/smaller: change `text-6xl md:text-7xl xl:text-8xl`
- Tight/loose vertical text spacing: change `leading-[0.95]`

## 2) Card Row Position + Height

Edit this wrapper:

```tsx
<div className="mt-auto grid min-h-0 h-[clamp(340px,48vh,430px)] gap-4 xl:gap-5 md:grid-cols-3">
```

- Push cards lower/higher: `mt-auto` (keep for bottom alignment)
- Total card area height: adjust `h-[clamp(340px,48vh,430px)]`
- Card spacing: adjust `gap-4 xl:gap-5`
- Columns on medium/desktop: `md:grid-cols-3`

## 3) Card Corner Radius / Shape

Each card uses:

```tsx
<Card className="rounded-3xl min-h-0 flex flex-col">
```

- Roundness: change `rounded-3xl` to `rounded-2xl` or `rounded-[30px]`

## 4) Dual Pie Chart Sizes (Outer tags, Inner difficulty)

Inside the first card:

```tsx
<Pie innerRadius={50} outerRadius={82} ... />   // outer ring (tags)
<Pie innerRadius={22} outerRadius={42} ... />   // inner ring (difficulty)
```

- Thicker outer ring: reduce `innerRadius` or increase `outerRadius`
- Bigger inner pie: increase both inner/outer values
- Chart box height: change `h-[200px]`

Color sources:

- `TAG_COLORS` for outer ring
- `DIFFICULTY_COLORS` for inner ring

## 5) Line Chart Shape + Emphasis

Inside the middle card:

```tsx
<Line type="monotone" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
```

- More curved look: keep `type="monotone"`
- Thicker line: increase `strokeWidth`
- Larger points: increase `dot.r` / `activeDot.r`
- Chart area height: `min-h-[220px]`

## 6) Stats Card Box Proportions

LeetCode / Codeforces blocks:

```tsx
<div className="rounded-2xl ... p-4">...</div>
```

- Larger inner boxes: increase `p-4` to `p-5`
- More spacing between boxes: change parent `gap-3`
- Box roundness: change `rounded-2xl`

## 7) Global Dashboard Padding

Top-level wrapper:

```tsx
<div className="h-full min-h-0 px-4 md:px-6 xl:px-10 py-4 ...">
```

- Horizontal spacing: change `px-4 md:px-6 xl:px-10`
- Vertical spacing: change `py-4`

## Quick Workflow for Fine-Tuning

1. Change one class only.
2. Save and preview in browser.
3. Repeat for spacing first, then typography, then chart sizes.
4. For exact matching, tune in this order:
   - header position/size
   - card row height
   - dual pie radii
   - line chart height and stroke
