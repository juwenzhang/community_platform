## ADDED Requirements

### Requirement: Notification creation on social events
The system SHALL create a notification record when a user's article receives a comment, like, or favorite from another user. Notifications SHALL be driven by NATS events published by svc-content.

#### Scenario: Comment notification
- **WHEN** user B comments on user A's article
- **THEN** system creates a notification for user A with type "comment", actor_id = B, target_type = "article", target_id = article ID

#### Scenario: Like notification
- **WHEN** user B likes user A's article
- **THEN** system creates a notification for user A with type "like", actor_id = B, target_type = "article", target_id = article ID

#### Scenario: Favorite notification
- **WHEN** user B favorites user A's article
- **THEN** system creates a notification for user A with type "favorite", actor_id = B, target_type = "article", target_id = article ID

#### Scenario: Self-action no notification
- **WHEN** user A comments/likes/favorites their own article
- **THEN** system SHALL NOT create a notification

### Requirement: Notification listing
The system SHALL provide a paginated list of notifications for the authenticated user, ordered by creation time descending.

#### Scenario: List notifications
- **WHEN** authenticated user calls ListNotifications with pagination
- **THEN** system returns notifications with actor info, target info, read status, and pagination metadata

#### Scenario: Unauthenticated access
- **WHEN** unauthenticated user calls ListNotifications
- **THEN** system returns UNAUTHENTICATED error

### Requirement: Unread notification count
The system SHALL provide the count of unread notifications for the authenticated user. The count SHALL be cached in Redis with 1-minute TTL.

#### Scenario: Get unread count
- **WHEN** authenticated user calls GetUnreadCount
- **THEN** system returns the number of notifications where is_read = false

### Requirement: Mark notifications as read
The system SHALL allow marking individual or all notifications as read.

#### Scenario: Mark single as read
- **WHEN** authenticated user calls MarkAsRead with notification_id
- **THEN** system sets is_read = true for that notification and invalidates unread count cache

#### Scenario: Mark all as read
- **WHEN** authenticated user calls MarkAllAsRead
- **THEN** system sets is_read = true for all user's unread notifications and invalidates unread count cache

### Requirement: Notification Proto definition
The system SHALL define NotificationService in `notification.proto` under `luhanxin.community.v1` package.

#### Scenario: Proto compilation
- **WHEN** `make proto` is executed
- **THEN** notification.proto generates valid Rust (prost + tonic) and TypeScript (protobuf-es) code

### Requirement: svc-notification microservice
The system SHALL implement svc-notification as an independent gRPC microservice on port 50053, registering with Consul for service discovery.

#### Scenario: Service startup
- **WHEN** svc-notification starts
- **THEN** it connects to PostgreSQL, NATS, Redis, registers with Consul, and starts gRPC server on port 50053

#### Scenario: NATS event subscription
- **WHEN** svc-notification starts
- **THEN** it subscribes to `luhanxin.events.content.>` and `luhanxin.events.social.>` NATS subjects

### Requirement: Frontend notification bell
The system SHALL display a notification bell icon in the Header with unread count badge.

#### Scenario: Unread indicator
- **WHEN** user has unread notifications
- **THEN** Header shows bell icon with red badge showing unread count

#### Scenario: No unread
- **WHEN** user has zero unread notifications
- **THEN** Header shows bell icon without badge

#### Scenario: Click bell
- **WHEN** user clicks the notification bell
- **THEN** system shows a Popover with recent 20 notifications

#### Scenario: Polling
- **WHEN** user is authenticated
- **THEN** system polls GetUnreadCount every 30 seconds
