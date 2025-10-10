#!/bin/bash

echo "🧪 Testing Cache Clearing for Placement Years"
echo "============================================="

BASE_URL="http://localhost:8000/api/v1"
COLLEGE_SLUG="iit-bombay"  # Replace with your test college slug
TEST_YEAR=2025

echo ""
echo "1️⃣ Get college profile (should cache it)..."
echo "URL: $BASE_URL/college/$COLLEGE_SLUG"
curl -s "$BASE_URL/college/$COLLEGE_SLUG" | jq '.data.availablePlacementReports // .data' | head -5

echo ""
echo ""
echo "2️⃣ Create placement data for year $TEST_YEAR..."
echo "This should trigger cache clearing and add $TEST_YEAR to availablePlacementReports"

# Create test placement data
curl -s -X POST "$BASE_URL/placement/$COLLEGE_SLUG" \
  -H "Content-Type: application/json" \
  -d '{
    "totalStudentsPlaced": 100,
    "totalOffers": 120,
    "highestPackageLPA": 50,
    "averagePackageLPA": 15,
    "year": '$TEST_YEAR'
  }' | jq '.message // .error'

echo ""
echo ""
echo "3️⃣ Get college profile again (cache should be cleared, should show updated data)..."
curl -s "$BASE_URL/college/$COLLEGE_SLUG" | jq '.data.availablePlacementReports // .data' 

echo ""
echo ""
echo "✅ Test completed! Check if $TEST_YEAR was added to availablePlacementReports"
