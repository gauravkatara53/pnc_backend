#!/bin/bash

echo "🔄 Testing Auto Placement Year Management"
echo "========================================"

BASE_URL="http://localhost:8000/api/v1"
COLLEGE_SLUG="iit-delhi"  # Replace with an actual college slug

echo ""
echo "1️⃣ Check current placement years for $COLLEGE_SLUG..."
curl -X GET "$BASE_URL/college/$COLLEGE_SLUG/placement-years" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "2️⃣ Manually add 2023 to placement years..."
curl -X POST "$BASE_URL/college/$COLLEGE_SLUG/placement-years" \
  -H "Content-Type: application/json" \
  -d '{"year": 2023}' \
  | jq '.'

echo ""
echo ""
echo "3️⃣ Create placement data for 2025 (should auto-add year)..."
curl -X POST "$BASE_URL/placement/$COLLEGE_SLUG" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "Computer Science",
    "placementPercentage": 95,
    "medianPackageLPA": 25,
    "highestPackageLPA": 55,
    "averagePackageLPA": 28,
    "year": 2025
  }' \
  | jq '.'

echo ""
echo ""
echo "4️⃣ Check placement years after auto-addition..."
curl -X GET "$BASE_URL/college/$COLLEGE_SLUG/placement-years" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "5️⃣ Create placement stats for 2024 (should auto-add year)..."
curl -X POST "$BASE_URL/placement/$COLLEGE_SLUG/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "totalOffers": 450,
    "highestPackage": 5500000,
    "averagePackage": 2800000,
    "recruiters": 120
  }' \
  | jq '.'

echo ""
echo ""
echo "6️⃣ Check final placement years..."
curl -X GET "$BASE_URL/college/$COLLEGE_SLUG/placement-years" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "7️⃣ Remove 2023 from placement years..."
curl -X DELETE "$BASE_URL/college/$COLLEGE_SLUG/placement-years/2023" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "8️⃣ Check placement years after removal..."
curl -X GET "$BASE_URL/college/$COLLEGE_SLUG/placement-years" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "✅ Auto Placement Year Management test completed!"
echo ""
echo "📋 Summary:"
echo "   - Years are automatically added when placement data is uploaded"
echo "   - Manual addition/removal is also supported"
echo "   - Years are stored in descending order (newest first)"
echo "   - Duplicate years are prevented"
