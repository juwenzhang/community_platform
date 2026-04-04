## ADDED Requirements

### Requirement: Cloudinary upload signature endpoint
The Gateway SHALL provide a REST endpoint to generate Cloudinary upload signatures for authenticated users, enabling secure client-side direct upload.

#### Scenario: Generate upload signature for avatar
- **WHEN** authenticated user sends `POST /api/v1/upload/sign` with `{ "folder": "avatars" }`
- **THEN** Gateway returns a JSON response containing `signature`, `timestamp`, `cloud_name`, `api_key`, and `folder` (set to `avatars/{user_id}`)

#### Scenario: Unauthenticated signature request
- **WHEN** unauthenticated user sends `POST /api/v1/upload/sign`
- **THEN** Gateway returns 401 Unauthorized

#### Scenario: Signature expiration
- **WHEN** a generated signature is used after 10 minutes
- **THEN** Cloudinary rejects the upload with an invalid signature error

### Requirement: Frontend avatar upload component
The system SHALL provide an `AvatarUpload` component that replaces the text input for avatar URL in EditProfileForm, supporting click-to-upload, drag-and-drop, and preview.

#### Scenario: Upload avatar image
- **WHEN** user selects an image file (JPEG/PNG/GIF/WebP, ≤ 2MB) via click or drag-and-drop
- **THEN** component requests upload signature from Gateway, uploads file directly to Cloudinary, displays upload progress, and on success calls `onChange` with the Cloudinary `secure_url`

#### Scenario: Preview current avatar
- **WHEN** AvatarUpload component renders with an existing `value` (avatar URL)
- **THEN** component displays the current avatar in a circular preview (using Cloudinary URL transformation `w_200,h_200,c_fill,g_face`)

#### Scenario: Invalid file type
- **WHEN** user selects a non-image file (e.g., .pdf, .exe)
- **THEN** component shows error message "仅支持 JPEG/PNG/GIF/WebP 格式" and does NOT upload

#### Scenario: File too large
- **WHEN** user selects an image file larger than 2MB
- **THEN** component shows error message "图片大小不能超过 2MB" and does NOT upload

#### Scenario: Upload in progress
- **WHEN** file is being uploaded to Cloudinary
- **THEN** component shows a loading spinner overlay on the avatar preview area

#### Scenario: Upload failure
- **WHEN** Cloudinary upload fails (network error, invalid signature, etc.)
- **THEN** component shows error message "上传失败，请重试" and allows user to retry

### Requirement: Cloudinary configuration
The system SHALL load Cloudinary credentials from environment variables, never hardcoding API secrets in source code.

#### Scenario: Configuration loading
- **WHEN** Gateway starts
- **THEN** it reads `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from environment variables

#### Scenario: Missing configuration
- **WHEN** any Cloudinary environment variable is missing
- **THEN** Gateway logs a warning and the upload sign endpoint returns 503 Service Unavailable

### Requirement: Cloudinary URL transformation for avatars
The system SHALL use Cloudinary URL transformations for avatar display, eliminating the need for server-side image processing.

#### Scenario: Avatar thumbnail in Header
- **WHEN** displaying user avatar in Header UserArea (28px)
- **THEN** system uses Cloudinary URL with transformation `/w_56,h_56,c_fill,g_face,f_auto,q_auto/` (2x for retina)

#### Scenario: Avatar in profile page
- **WHEN** displaying user avatar in profile page (80px)
- **THEN** system uses Cloudinary URL with transformation `/w_160,h_160,c_fill,g_face,f_auto,q_auto/`

#### Scenario: Avatar in edit form preview
- **WHEN** displaying avatar preview in AvatarUpload component (120px)
- **THEN** system uses Cloudinary URL with transformation `/w_240,h_240,c_fill,g_face,f_auto,q_auto/`

### Requirement: Upload Proto definition
The system SHALL define UploadService in `upload.proto` under `luhanxin.community.v1` package for future extensibility, even though the current upload flow uses REST.

#### Scenario: Proto compilation
- **WHEN** `make proto` is executed
- **THEN** upload.proto generates valid Rust and TypeScript code with `GetUploadSignature` RPC definition
