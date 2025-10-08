# Related News API Documentation

## Endpoint

`GET /api/v1/news/related/:slug`

## Description

Returns 4 related news articles based on the provided news slug. The system finds related articles by matching:

1. **Category** (higher priority - 10 points)
2. **Tags** (2 points per matching tag)
3. **Recent articles** (fallback if not enough related content found)

## URL Parameters

- `slug` (string, required): The slug of the news article to find related content for

## Response Format

### Success Response (200)

```json
{
  "statusCode": 200,
  "data": {
    "relatedArticles": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "AI Revolution in Healthcare",
        "slug": "ai-healthcare-revolution",
        "coverImage": "https://example.com/ai-healthcare.jpg"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "title": "Machine Learning Applications in Finance",
        "slug": "ml-finance-applications",
        "coverImage": "https://example.com/ml-finance.jpg"
      },
      {
        "id": "507f1f77bcf86cd799439013",
        "title": "Future of Tech Startups",
        "slug": "future-tech-startups",
        "coverImage": null
      },
      {
        "id": "507f1f77bcf86cd799439014",
        "title": "Recent Business Updates",
        "slug": "recent-business-updates",
        "coverImage": "https://example.com/business.jpg"
      }
    ],
    "totalFound": 4
  },
  "message": "Related news fetched successfully",
  "success": true
}
```

### Error Responses

#### Article Not Found (404)

```json
{
  "statusCode": 404,
  "data": null,
  "message": "Original article not found",
  "success": false
}
```

#### Server Error (500)

```json
{
  "statusCode": 500,
  "data": null,
  "message": "Internal server error",
  "success": false
}
```

## Algorithm Details

### Relevance Scoring

1. **Category Match**: +10 points if articles share the same category
2. **Tag Match**: +2 points for each matching tag
3. **Publish Date**: Secondary sorting criteria for articles with same relevance score

### Fallback Strategy

- If fewer than 4 related articles are found, the system fills the remaining spots with the most recent articles
- Original article is always excluded from results
- Already selected articles are excluded from fallback selection

## Caching Strategy

### Cache Levels

- **L1 (NodeCache)**: 5-minute TTL for ultra-fast access
- **L2 (Redis)**: 10-minute TTL for shared cache across instances

### Cache Keys

- Pattern: `news:related:{slug}`
- Example: `news:related:technology-trends-2025`

### Cache Invalidation

- Automatically cleared when any news article is created, updated, or deleted
- Manual cache clearing available via admin endpoints

## Usage Examples

### Fetch Related News

```bash
curl -X GET "http://localhost:8000/api/v1/news/related/technology-trends-2025"
```

### Response Fields Description

### Response Fields Description

- `id`: MongoDB ObjectId of the article
- `title`: Article title
- `slug`: URL-friendly article identifier
- `coverImage`: Article cover image URL (can be null)
- `totalFound`: Number of related articles found

## Performance Features

- **Efficient Database Queries**: Uses MongoDB aggregation for optimal performance
- **Smart Caching**: Dual-layer cache system for fast response times
- **Relevance Scoring**: Intelligent algorithm to find most relevant content
- **Fallback Mechanism**: Always returns 4 articles when possible

## Error Handling

- Graceful handling of missing articles
- Cache failures don't affect functionality
- Detailed error messages for debugging
- Automatic retry mechanisms for temporary failures
