## ADDED Requirements

### Requirement: Article full-text search
The system SHALL provide full-text search for articles using Meilisearch, supporting Chinese word segmentation and search highlighting.

#### Scenario: Search articles by keyword
- **WHEN** user calls SearchArticles with query "Rust 并发"
- **THEN** system returns matching articles from Meilisearch with highlighted title and summary, ordered by relevance

#### Scenario: Empty query
- **WHEN** user calls SearchArticles with empty query
- **THEN** system returns INVALID_ARGUMENT error

#### Scenario: No results
- **WHEN** user calls SearchArticles with query that matches no articles
- **THEN** system returns empty list with zero total count

### Requirement: User search
The system SHALL provide search for users by username or display name using Meilisearch.

#### Scenario: Search users
- **WHEN** user calls SearchUsers with query "zhang"
- **THEN** system returns matching users with highlighted username and display_name

### Requirement: Meilisearch index synchronization
The system SHALL synchronize article data to Meilisearch index via NATS events asynchronously.

#### Scenario: Article published
- **WHEN** a new article is published or an existing article is updated
- **THEN** svc-content publishes a NATS event, and the indexer updates the Meilisearch articles index

#### Scenario: Article deleted
- **WHEN** an article is soft-deleted
- **THEN** the indexer removes the article from the Meilisearch articles index

#### Scenario: User profile updated
- **WHEN** a user updates their profile
- **THEN** svc-user publishes a NATS event, and the indexer updates the Meilisearch users index

### Requirement: Search Proto definition
The system SHALL define SearchService in `search.proto` under `luhanxin.community.v1` package with SearchArticles and SearchUsers RPCs.

#### Scenario: Proto compilation
- **WHEN** `make proto` is executed
- **THEN** search.proto generates valid Rust and TypeScript code

### Requirement: Search results page
The system SHALL provide a dedicated search results page at `/search` with tabbed results (articles/users).

#### Scenario: Search page navigation
- **WHEN** user types in header search bar and presses Enter
- **THEN** system navigates to `/search?q=<query>` showing search results

#### Scenario: Tab switching
- **WHEN** user clicks "用户" tab on search results page
- **THEN** system shows user search results for the same query

### Requirement: Gateway search BFF
The Gateway SHALL implement SearchService by directly calling Meilisearch HTTP API (not via gRPC microservice) for low-latency search.

#### Scenario: Search request flow
- **WHEN** frontend calls SearchArticles via Connect RPC
- **THEN** Gateway queries Meilisearch HTTP API, enriches results with author info from svc-user, and returns response
