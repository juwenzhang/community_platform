## ADDED Requirements

### Requirement: ExpressionPicker component
The system SHALL provide an ExpressionPicker component with three tabs: Emoji, GIF, and Sticker.

#### Scenario: Tab switching
- **WHEN** user opens the ExpressionPicker
- **THEN** three tabs are visible: 😀 Emoji | 🎬 GIF | ✨ Sticker
- **THEN** default tab is Emoji (preserving current behavior)

#### Scenario: Emoji tab
- **WHEN** user selects the Emoji tab
- **THEN** existing EmojiPicker is shown (67 Unicode emoji, 3 categories)
- **THEN** selecting an emoji inserts it at cursor position in the comment textarea

### Requirement: GIF search and selection
The system SHALL allow searching and selecting GIPHY GIFs via `@giphy/react-components` Grid component.

#### Scenario: GIF tab default view
- **WHEN** user selects the GIF tab
- **THEN** system displays trending GIFs in a responsive grid (via `gf.trending({ type: 'gifs' })`)
- **THEN** a search bar is shown above the grid

#### Scenario: GIF search
- **WHEN** user types "cat" in the GIF search bar
- **THEN** system displays search results from GIPHY API (via `gf.search("cat", { type: 'gifs' })`)
- **THEN** results update as user types (debounced 300ms)

#### Scenario: GIF selection
- **WHEN** user clicks a GIF in the grid
- **THEN** the GIF is added as a MediaAttachment (type=GIF) to the comment input area
- **THEN** a preview of the selected GIF appears in the media preview area below the textarea
- **THEN** the ExpressionPicker closes

#### Scenario: Remove selected GIF
- **WHEN** user clicks the remove button on the GIF preview
- **THEN** the GIF is removed from the comment's pending media attachments

### Requirement: Sticker search and selection
The system SHALL allow searching and selecting GIPHY Stickers.

#### Scenario: Sticker tab default view
- **WHEN** user selects the Sticker tab
- **THEN** system displays trending Stickers (via `gf.trending({ type: 'stickers' })`)

#### Scenario: Sticker search
- **WHEN** user types "happy" in the Sticker search bar
- **THEN** system displays Sticker search results from GIPHY API

#### Scenario: Sticker selection
- **WHEN** user clicks a Sticker in the grid
- **THEN** the Sticker is added as a MediaAttachment (type=STICKER)
- **THEN** a preview with transparent background appears in the media preview area

### Requirement: Single media limit
The system SHALL enforce a maximum of 1 GIF or Sticker per comment.

#### Scenario: Replace existing media
- **WHEN** user has already selected a GIF and then selects a Sticker
- **THEN** the Sticker replaces the previously selected GIF

### Requirement: GIPHY SDK initialization
The system SHALL initialize GIPHY SDK with API key from environment variable.

#### Scenario: SDK setup
- **WHEN** application starts
- **THEN** `GiphyFetch` is initialized with `import.meta.env.VITE_GIPHY_API_KEY`
- **THEN** API key is not hardcoded in source code

### Requirement: GIPHY Attribution
The system SHALL display GIPHY attribution as required by GIPHY Terms of Service.

#### Scenario: Attribution in picker
- **WHEN** GIF or Sticker tab is active in ExpressionPicker
- **THEN** "Powered by GIPHY" logo/text is visible at the bottom of the panel

### Requirement: GIPHY error handling
The system SHALL gracefully handle GIPHY API failures.

#### Scenario: API unavailable
- **WHEN** GIPHY API request fails (network error or rate limit)
- **THEN** system shows "GIF 加载失败，请稍后重试" message in the grid area
- **THEN** Emoji tab remains fully functional as fallback

### Requirement: Integration with CommentSection
The ExpressionPicker SHALL be integrated into the existing CommentSection component.

#### Scenario: Main comment input toolbar
- **WHEN** user views the comment input area (authenticated)
- **THEN** toolbar shows: [😊 表情] [🎬 GIF] [✨ Sticker] [发表评论]

#### Scenario: Inline reply toolbar
- **WHEN** user opens an inline reply box
- **THEN** toolbar shows the same expression buttons in compact mode

#### Scenario: Submit comment with media
- **WHEN** user clicks "发表评论" with text content and a selected GIF
- **THEN** system calls CreateComment with both content and media_attachments
- **THEN** on success, textarea is cleared and media preview is removed
