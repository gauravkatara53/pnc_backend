#!/bin/bash

# Recent Activities API Test Script
# This script tests the newly created recent activities API

BASE_URL="http://localhost:3000/api/v1/activities"

echo "🔥 Testing Recent Activities API"
echo "================================="

# Test 1: Get recent activities (default 5)
echo "📊 Test 1: Get 5 most recent activities"
echo "GET $BASE_URL/recent"
curl -s -X GET "$BASE_URL/recent" | jq '.'
echo ""
echo "----------------------------------------"

# Test 2: Get recent activities with limit
echo "📊 Test 2: Get 10 most recent activities"
echo "GET $BASE_URL/recent?limit=10"
curl -s -X GET "$BASE_URL/recent?limit=10" | jq '.'
echo ""
echo "----------------------------------------"

# Test 3: Filter by entity type
echo "📊 Test 3: Get recent COLLEGE_PROFILE activities"
echo "GET $BASE_URL/recent?entityType=COLLEGE_PROFILE&limit=5"
curl -s -X GET "$BASE_URL/recent?entityType=COLLEGE_PROFILE&limit=5" | jq '.'
echo ""
echo "----------------------------------------"

# Test 4: Filter by action
echo "📊 Test 4: Get recent CREATE activities"
echo "GET $BASE_URL/recent?action=CREATE&limit=5"
curl -s -X GET "$BASE_URL/recent?action=CREATE&limit=5" | jq '.'
echo ""
echo "----------------------------------------"

# Test 5: Get activity statistics
echo "📊 Test 5: Get activity statistics for today"
echo "GET $BASE_URL/stats?timeframe=today"
curl -s -X GET "$BASE_URL/stats?timeframe=today" | jq '.'
echo ""
echo "----------------------------------------"

# Test 6: Get available filters
echo "📊 Test 6: Get available filters"
echo "GET $BASE_URL/filters"
curl -s -X GET "$BASE_URL/filters" | jq '.'
echo ""
echo "----------------------------------------"

# Test 7: Get activities for a specific entity (example)
echo "📊 Test 7: Get activities for a specific college (if exists)"
echo "GET $BASE_URL/entity/COLLEGE_PROFILE/sample-college-slug"
curl -s -X GET "$BASE_URL/entity/COLLEGE_PROFILE/sample-college-slug" | jq '.'
echo ""
echo "----------------------------------------"

echo "✅ All tests completed!"
echo ""
echo "📝 Available API Endpoints:"
echo "  GET /api/v1/activities/recent - Get recent activities"
echo "  GET /api/v1/activities/entity/:type/:id - Get activities for specific entity"
echo "  GET /api/v1/activities/user/:userId - Get user activities"
echo "  GET /api/v1/activities/stats - Get activity statistics"
echo "  GET /api/v1/activities/filters - Get available filters"
echo ""
echo "📖 Query Parameters for /recent:"
echo "  - limit: Number of activities (1-50, default: 5)"
echo "  - entityType: Filter by entity type (COLLEGE_PROFILE, PLACEMENT, NEWS, etc.)"
echo "  - action: Filter by action (CREATE, UPDATE, DELETE)"
echo ""
echo "🎯 The API will automatically track activities when you:"
echo "  - Create colleges, placements, or news articles"
echo "  - Update existing records"
echo "  - Delete records (once implemented)"
