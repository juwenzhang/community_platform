## ADDED Requirements

### Requirement: Dark theme CSS variables
The system SHALL provide a complete set of dark theme CSS variables under `[data-theme="dark"]` selector in `variables.less`, covering all semantic color tokens defined in `:root`.

#### Scenario: Dark theme variables defined
- **WHEN** `[data-theme="dark"]` attribute is set on `<html>` element
- **THEN** all CSS variables (`--color-primary`, `--color-text-1` ~ `--color-text-4`, `--color-bg-page`, `--color-bg-card`, `--color-bg-hover`, `--color-border`, `--shadow-sm`, `--shadow-md`, etc.) override to dark-appropriate values

#### Scenario: Light theme remains default
- **WHEN** no `data-theme` attribute is present on `<html>` element
- **THEN** CSS variables use the existing `:root` light theme values (no changes to current behavior)

### Requirement: Theme state management
The system SHALL provide a `useThemeStore` Zustand store to manage the current theme (`light` | `dark`), persisted to `localStorage`.

#### Scenario: Initial theme load
- **WHEN** application starts
- **THEN** `useThemeStore` reads theme from `localStorage` key `luhanxin-theme`; if absent, defaults to `light`

#### Scenario: Toggle theme
- **WHEN** user calls `useThemeStore.toggle()`
- **THEN** theme switches between `light` and `dark`, updates `localStorage`, and sets `data-theme` attribute on `document.documentElement`

#### Scenario: Theme persisted across sessions
- **WHEN** user sets theme to `dark` and refreshes the page
- **THEN** application loads with dark theme without flash of light theme

### Requirement: Ant Design theme algorithm switching
The system SHALL dynamically switch Ant Design's `ConfigProvider` `algorithm` between `defaultAlgorithm` and `darkAlgorithm` based on the current theme.

#### Scenario: Dark mode Antd components
- **WHEN** theme is set to `dark`
- **THEN** `ConfigProvider` uses `theme.darkAlgorithm`, and all Ant Design components render with dark styling

#### Scenario: Light mode Antd components
- **WHEN** theme is set to `light`
- **THEN** `ConfigProvider` uses `theme.defaultAlgorithm`, matching current behavior

### Requirement: Theme toggle button in Header
The system SHALL display a theme toggle icon button in the Header, positioned to the left of UserArea.

#### Scenario: Light mode icon
- **WHEN** current theme is `light`
- **THEN** Header shows `<MoonOutlined />` icon (click to switch to dark)

#### Scenario: Dark mode icon
- **WHEN** current theme is `dark`
- **THEN** Header shows `<SunOutlined />` icon (click to switch to light)

#### Scenario: Toggle click
- **WHEN** user clicks the theme toggle button
- **THEN** theme switches immediately, all CSS variables and Antd algorithm update synchronously

### Requirement: Flash-of-unstyled-theme prevention
The system SHALL prevent the flash of light theme when dark theme is persisted, by injecting an inline script in `<head>` that reads `localStorage` and sets `data-theme` before first paint.

#### Scenario: Dark theme page load
- **WHEN** user has `luhanxin-theme: dark` in localStorage and navigates to any page
- **THEN** page renders with dark theme from the first paint (no visible flash of light theme)

### Requirement: Existing components dark mode compatibility
All existing components that use CSS variables SHALL render correctly in dark mode without additional code changes.

#### Scenario: Header in dark mode
- **WHEN** theme is `dark`
- **THEN** Header background uses `--color-bg-card`, text uses `--color-text-1`, border uses `--color-border`

#### Scenario: Article cards in dark mode
- **WHEN** theme is `dark`
- **THEN** article cards use `--color-bg-card` background, `--color-text-1` title, `--color-text-3` metadata text
