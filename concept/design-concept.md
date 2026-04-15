# Sapphirix — Frontend Design Concept

## 1. Design Philosophy

Sapphirix targets salon owners and their customers. The design must feel **modern, professional, and approachable** — like a well-run boutique salon itself. We favor a **bright light-mode** aesthetic with generous whitespace, clear hierarchy, and polished micro-interactions.

**Core principles:**

- **Clean & airy** — bright backgrounds, ample padding, no visual clutter
- **Warm professionalism** — subtle warmth through accent colors, not cold corporate blues
- **Clarity over decoration** — every element earns its place
- **Consistent rhythm** — uniform spacing, border-radius, and shadow language

---

## 2. Color Palette

We move away from the dark stone/amber theme toward a fresh, bright palette.

### Primary palette

| Role | Color | Tailwind | Usage |
|------|-------|----------|-------|
| **Background** | `#FAFAFA` | `gray-50` | Main page background |
| **Surface** | `#FFFFFF` | `white` | Cards, panels, modals |
| **Surface alt** | `#F3F4F6` | `gray-100` | Secondary cards, table rows |
| **Text primary** | `#111827` | `gray-900` | Headings, body text |
| **Text secondary** | `#6B7280` | `gray-500` | Labels, hints, metadata |
| **Text muted** | `#9CA3AF` | `gray-400` | Placeholders, disabled text |
| **Border** | `#E5E7EB` | `gray-200` | Card borders, dividers |
| **Border focus** | `#A78BFA` | `violet-400` | Input focus rings |

### Accent colors

| Role | Color | Tailwind | Usage |
|------|-------|----------|-------|
| **Primary** | `#7C3AED` | `violet-600` | Primary buttons, active states, links |
| **Primary hover** | `#6D28D9` | `violet-700` | Button hover |
| **Primary light** | `#EDE9FE` | `violet-100` | Primary badges, subtle highlights |
| **Success** | `#059669` | `emerald-600` | Success messages, active indicators |
| **Success light** | `#D1FAE5` | `emerald-100` | Success banners |
| **Warning** | `#D97706` | `amber-600` | Warning states |
| **Warning light** | `#FEF3C7` | `amber-100` | Warning banners |
| **Danger** | `#DC2626` | `red-600` | Delete actions, error badges |
| **Danger light** | `#FEE2E2` | `red-100` | Error banners |

### Rationale

Violet is distinctive and modern — it avoids the overused blue of most SaaS tools while staying professional. Combined with the warm gray scale, it creates a premium feel that resonates with beauty/salon branding.

---

## 3. Typography

- **Font family**: System font stack (`font-sans` in Tailwind — Inter, SF Pro, Segoe UI, etc.)
- **Headings**: `font-semibold`, sizes from `text-2xl` (section titles) to `text-sm` (card labels)
- **Body text**: `text-sm` or `text-base`, `text-gray-700` for regular content
- **Labels**: `text-sm font-medium text-gray-700` — above form inputs
- **No uppercase tracking labels** — replaced with simple `font-medium` labels for better readability

---

## 4. Spacing & Layout

- **Page padding**: `px-4 sm:px-6 lg:px-8` with `max-w-6xl mx-auto`
- **Card padding**: `p-6` standard
- **Section spacing**: `space-y-6` between cards
- **Grid**: CSS grid with `gap-6`, responsive breakpoints
- **Border radius**: `rounded-xl` for cards, `rounded-lg` for inputs, `rounded-md` for buttons

---

## 5. Component Language

### Cards

```
bg-white border border-gray-200 rounded-xl shadow-sm
```

Clean flat cards with a subtle shadow. No heavy drop shadows or colored borders.

### Inputs

```
w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900
placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
transition-colors
```

Visible borders, clear focus states with the violet accent ring. No overly rounded pill shapes.

### Buttons (primary)

```
rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white
shadow-sm hover:bg-violet-700 focus:ring-2 focus:ring-violet-500/20
transition-colors
```

### Buttons (secondary / outline)

```
rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700
hover:bg-gray-50 transition-colors
```

### Buttons (danger)

```
rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700
hover:bg-red-100 transition-colors
```

### Status banners

- **Success**: `bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3`
- **Error**: `bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3`
- **Warning**: `bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3`

### Section headers

Each card/section uses a pattern:

```html
<div class="flex items-center justify-between mb-6">
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Section Title</h2>
    <p class="mt-1 text-sm text-gray-500">Brief description</p>
  </div>
  <button>Action</button>
</div>
```

---

## 6. Page Layout — Admin Shell

### Top bar

A slim, sticky top bar with:

- Salon name (left)
- Admin name + sign out button (right)
- White background with bottom border

### Content area

- Single column with max-width container
- Sections stacked vertically with consistent card wrapping
- Each section is a white card with its own header and content

### Section breakdown

1. **Salon Profile** — form fields in a 2-column grid
2. **Logo** — inline within the profile card or adjacent small card
3. **Services** — list of service cards with inline form for add/edit
4. **Opening Hours** — 7-day accordion or compact grid
5. **Time Off** — form + list of blocked periods

---

## 7. Page Layout — Login

Centered card layout on the light background:

- Centered container (`max-w-md`)
- App branding / logo area above the form
- Clean form card with email + password fields
- Primary violet "Sign in" button
- Subtle informational text below

No split-screen hero — just a simple, focused login experience.

---

## 8. PrimeNG Integration

PrimeNG components are used where they add real value:

- **Button** (`p-button`) — primary actions, with custom styling overrides
- **InputText** (`pInputText`) — text inputs
- **Password** (`p-password`) — password field with toggle
- **Tooltip** — for icon-only actions
- **ConfirmDialog** — replacing `window.confirm()` in future

PrimeNG's default theme is overridden to match our Tailwind-driven design system. We use the Aura theme preset, customized to violet.

---

## 9. Responsive Behavior

- **Mobile-first** layout approach
- Forms collapse to single column on small screens
- Top bar collapses to compact view with menu icon
- Cards use full width on mobile
- Touch-friendly tap targets (min 44px)

---

## 10. Interaction Details

- **Focus rings**: Violet ring on interactive elements (`ring-2 ring-violet-500/20`)
- **Transitions**: `transition-colors` on buttons and inputs for smooth hover/focus
- **Loading states**: Spinner inside buttons, skeleton placeholders for content
- **Feedback**: Success/error banners appear at the top of the relevant section
- **Confirmations**: Inline confirmation patterns rather than browser `confirm()` dialogs
