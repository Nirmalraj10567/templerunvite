# Annadhanam Theme Documentation

## Overview
This theme system is designed for the Temple Management System (TMS) Annadhanam module, featuring a warm orange/red color palette that reflects traditional temple aesthetics.

---

## Color Palette

### Primary Colors
| Color | Hex Code | Usage |
|-------|----------|-------|
| Orange 500 | `#f97316` | Primary buttons, active states, icons |
| Orange 600 | `#ea580c` | Button hover states |
| Red 500 | `#ef4444` | Gradient end, error states |
| Red 600 | `#dc2626` | Gradient hover end |

### Background Colors
| Color | Hex Code | Usage |
|-------|----------|-------|
| Orange 50 | `#fff7ed` | Page background gradient start |
| Red 50 | `#fef2f2` | Page background gradient end |
| White | `#ffffff` | Card backgrounds, input fields |

### Semantic Colors
| Color | Hex Code | Usage |
|-------|----------|-------|
| Red 500 | `#ef4444` | Error borders, validation messages |
| Gray 400 | `#9ca3af` | Icons, placeholders |
| Gray 700 | `#374151` | Header text |

---

## Gradients

### Card Header
```
bg-gradient-to-r from-orange-500 to-red-600
```
**Usage:** Section headers, primary action cards

### Button Primary
```
bg-gradient-to-r from-orange-500 to-red-600
hover:from-orange-600 hover:to-red-700
```
**Usage:** Save buttons, primary actions

### Page Background
```
bg-gradient-to-br from-orange-50 to-red-50
```
**Usage:** Main container backgrounds

---

## Input Field Styling

### Field Sizes & Structure
| Element | Size/Spacing | Class |
|---------|--------------|-------|
| Icon Size | `w-4 h-4` | Small, consistent across all fields |
| Icon Position | `absolute left-3 top-1/2 transform -translate-y-1/2` | Vertically centered |
| Input Padding (with icon) | `pl-10` | Space for left icon |
| Input Padding (no icon) | `pl-4` | Standard padding |
| Dropdown Padding | `pl-10 pr-10 py-2` | Space for both icons |
| Field Gap | `gap-6` | Between form fields |
| Error Margin | `mt-1` | Between input and error message |

### Base Input Style - Full Specification
```tsx
className="pl-10 border-orange-300 
  focus:border-orange-500 
  focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 
  focus:outline-none 
  focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 
  focus-visible:outline-none 
  shadow-sm focus:shadow-md 
  transition-all duration-200"
```

### Input with Error State (Conditional)
```tsx
className={`pl-10 
  border-orange-300 
  ${errors.fieldName ? 'border-red-500' : ''} 
  focus:border-orange-500 
  focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 
  focus:outline-none 
  focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 
  focus-visible:outline-none 
  shadow-sm focus:shadow-md 
  transition-all duration-200`}
```

### Select Dropdown Style
```tsx
className="w-full pl-10 pr-10 py-2 
  border border-orange-300 rounded-lg 
  focus:outline-none 
  focus:border-orange-500 
  focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 
  focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 
  focus-visible:outline-none 
  appearance-none bg-white 
  shadow-sm focus:shadow-md 
  transition-all duration-200"
```

### Read-Only Input Style
```tsx
className="pl-10 bg-gray-50 
  border-orange-300 
  focus:border-orange-500 
  focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 
  focus:outline-none 
  focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 
  focus-visible:outline-none 
  shadow-sm focus:shadow-md 
  transition-all duration-200"
```

### Input Components
- **Text Inputs:** User icon (left), validation error (below)
- **Select Dropdowns:** Dynamic icon based on selection, chevron arrow (right)
- **Date/Time Pickers:** Calendar/Clock icons, native picker support with hidden indicators
- **Number Inputs:** Min/max validation, mobile numeric keyboard
- **Read-Only:** Gray background (`bg-gray-50`)

---

## Focus States

### Focus Ring
- **Color:** Orange 500 (`#f97316`)
- **Width:** 2px
- **Offset:** 2px (white gap for visibility)
- **Outline:** None (removes default browser outline)

### Implementation
```
focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
focus-visible:outline-none
```

---

## Shadows & Elevation

### Input Shadows
```
shadow-sm (default)
focus:shadow-md (on focus)
```

### Button Shadows
```
shadow-lg (default)
hover:shadow-xl (on hover)
```

### Card Shadows
```
shadow-md (cards)
hover:shadow-lg (card hover)
```

---

## Validation Styling

### Error State
- **Border:** Red 500 (`#ef4444`)
- **Message Color:** Red 500
- **Message Size:** `text-xs`
- **Message Margin:** `mt-1`

### Required Field Indicator
- **Placeholder:** Field name + ` *`
- **Example:** `Name *`, `Mobile *`

---

## Icons

### Positioning
- **Left icons:** `absolute left-3 top-1/2 transform -translate-y-1/2`
- **Size:** `w-4 h-4`
- **Color:** Gray 400 (`#9ca3af`)

### Field Icons
| Field | Icon | Icon Color |
|-------|------|------------|
| Name | User | Gray 400 |
| Mobile | Phone | Gray 400 |
| Time | Clock | Gray 400 |
| Date | Calendar | Gray 400 |
| Food Donation | Coffee | Orange 500 |
| Product Donation | Package | Blue 500 |
| Money Donation | DollarSign | Green 500 |
| Remarks | FileText | Gray 400 |

---

## Layout

### Grid System
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
```

### Container Padding
```
p-6 (cards)
px-6 py-4 (card headers)
```

### Form Spacing
```
gap-6 (between form fields)
mt-1 (error message spacing)
```

---

## Typography

### Headers
- **Card Header:** `text-white font-semibold`
- **Page Title:** `text-lg font-semibold text-gray-700`

### Form Labels
- **Placeholder:** Field name + required indicator
- **Error Messages:** `text-xs text-red-500`

---

## Transitions

### Duration
```
transition-all duration-200
```

### Hover Effects
- **Buttons:** Scale transform, shadow increase
- **Cards:** Shadow lift
- **Inputs:** Border color change, shadow increase

---

## Responsive Breakpoints

| Breakpoint | Columns | Usage |
|------------|---------|-------|
| Default | 1 column | Mobile |
| `md` (768px+) | 2 columns | Tablet |
| `lg` (1024px+) | 3 columns | Desktop |

---

## Usage Example

```tsx
<div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
  <Card className="shadow-lg">
    <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
      <CardTitle>Donation Details</CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Input with icon */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10 border-orange-300 focus:border-orange-500 
              focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 
              focus:outline-none shadow-sm focus:shadow-md transition-all duration-200"
            placeholder="Name *"
          />
        </div>
      </div>
      
      {/* Primary Button */}
      <Button className="bg-gradient-to-r from-orange-500 to-red-600 
        hover:from-orange-600 hover:to-red-700 
        text-white shadow-lg hover:shadow-xl 
        transform hover:scale-105 transition-all duration-200">
        Save
      </Button>
    </CardContent>
  </Card>
</div>
```

---

## Files Using This Theme

- `src/pages/annadhanam/AnnadhanamEntryPage.tsx`
- `src/pages/annadhanam/AnnadhanamListView.tsx`

---

## Key Principles

1. **Consistency:** All inputs use the same orange focus ring and border colors
2. **Visibility:** Focus rings have white offset for clear visibility
3. **Feedback:** Error states show red borders and clear messages
4. **Accessibility:** High contrast colors, clear focus indicators
5. **Warmth:** Orange/red palette reflects temple traditions
