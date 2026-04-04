## ADDED Requirements

### Requirement: Business event publishing
The svc-content and svc-user services SHALL publish NATS events after successful business operations to support notification and search index synchronization.

#### Scenario: Comment event published
- **WHEN** a user successfully creates a comment on an article
- **THEN** svc-content publishes an EventEnvelope to `luhanxin.events.content.commented` with payload containing article_id, commenter_id, and comment_id

#### Scenario: Like event published
- **WHEN** a user successfully likes an article
- **THEN** svc-content publishes an EventEnvelope to `luhanxin.events.social.liked` with payload containing article_id and liker_id

#### Scenario: Favorite event published
- **WHEN** a user successfully favorites an article
- **THEN** svc-content publishes an EventEnvelope to `luhanxin.events.social.favorited` with payload containing article_id and user_id

#### Scenario: Article published event
- **WHEN** a user publishes a new article or updates an existing one
- **THEN** svc-content publishes an EventEnvelope to `luhanxin.events.content.published` with the article data for search indexing

#### Scenario: Article deleted event
- **WHEN** a user deletes an article
- **THEN** svc-content publishes an EventEnvelope to `luhanxin.events.content.deleted` with article_id for search index removal

#### Scenario: User profile updated event
- **WHEN** a user updates their profile
- **THEN** svc-user publishes an EventEnvelope to `luhanxin.events.user.updated` with user data for search index update

#### Scenario: NATS publish failure
- **WHEN** NATS publish fails
- **THEN** system logs warning but does NOT fail the main business operation (fire-and-forget)
