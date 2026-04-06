## MODIFIED Requirements

> Delta spec for the archived `comment-system` capability. Extends Comment message with media attachments support.

### Requirement: Comment Proto — MediaAttachment extension
The `Comment` message SHALL include a `repeated MediaAttachment media_attachments` field to support rich media in comments.

#### Scenario: Proto field addition
- **WHEN** `make proto` is executed
- **THEN** `comment.proto` compiles successfully with the new `MediaAttachment` message and `MediaType` enum
- **THEN** `Comment` message has field `repeated MediaAttachment media_attachments = 14` (field 13 is reply_count)
- **THEN** `CreateCommentRequest` message has field `repeated MediaAttachment media_attachments = 5`

#### Scenario: MediaAttachment message structure
- **WHEN** a MediaAttachment is created
- **THEN** it contains: `media_type` (enum: GIF/STICKER/IMAGE), `url` (string), `preview_url` (string), `width` (int32), `height` (int32), `giphy_id` (string), `alt_text` (string)

### Requirement: Database migration — media_attachments column
The `comments` table SHALL have a `media_attachments JSONB` column to store structured media metadata.

#### Scenario: Migration
- **WHEN** migration runs
- **THEN** `comments` table gains `media_attachments JSONB NOT NULL DEFAULT '[]'` column
- **THEN** existing comments are unaffected (default empty array)

### Requirement: Create comment with media
The system SHALL allow creating comments with media attachments (GIF/Sticker).

#### Scenario: Comment with GIF
- **WHEN** authenticated user creates a comment with content "这个太搞笑了" and one MediaAttachment of type GIF
- **THEN** comment is created with both text content and media_attachments stored in database
- **THEN** response includes the media_attachments field

#### Scenario: Comment with only media (no text)
- **WHEN** authenticated user creates a comment with empty content but one MediaAttachment
- **THEN** comment is created successfully (either text or media must be non-empty)

#### Scenario: Comment without text and without media
- **WHEN** authenticated user creates a comment with empty content and empty media_attachments
- **THEN** system returns INVALID_ARGUMENT error

#### Scenario: Media count limit
- **WHEN** user attempts to create a comment with more than 1 GIF/Sticker attachment
- **THEN** system returns INVALID_ARGUMENT error with message "最多附带 1 个 GIF 或 Sticker"

### Requirement: List comments with media
The system SHALL return media_attachments when listing comments.

#### Scenario: Comments with mixed content
- **WHEN** listing comments for an article
- **THEN** each comment includes its `media_attachments` array (empty array if no media)
- **THEN** media_attachments contain all fields (media_type, url, preview_url, width, height, giphy_id, alt_text)

### Requirement: Comment media rendering
The frontend SHALL render media attachments inline within comments.

#### Scenario: GIF rendering
- **WHEN** a comment contains a GIF attachment
- **THEN** the GIF is displayed below the comment text
- **THEN** GIF auto-plays in a constrained size (max-height 200px)
- **THEN** clicking the GIF opens a larger view

#### Scenario: Sticker rendering
- **WHEN** a comment contains a Sticker attachment
- **THEN** the Sticker is displayed below the comment text with transparent background
- **THEN** Sticker max-height is 150px

#### Scenario: Text-only comment
- **WHEN** a comment has no media_attachments
- **THEN** comment renders as before (text + mentions only), no layout change
