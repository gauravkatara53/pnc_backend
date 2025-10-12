// Simple Node.js script to test the Recent Activities API
// This shows how to get the last 10 activities from your database

const BASE_URL = "http://localhost:8000/api/v1/activities"; // Adjust port as needed

async function testRecentActivitiesAPI() {
  console.log("🚀 Testing Recent Activities API...\n");

  try {
    // Test 1: Get last 10 activities
    console.log("📊 1. Getting last 10 recent activities:");
    const response10 = await fetch(`${BASE_URL}/recent?limit=10`);
    const data10 = await response10.json();

    if (data10.success) {
      console.log(`✅ Found ${data10.data.count} activities`);
      data10.data.activities.forEach((activity, index) => {
        console.log(
          `   ${index + 1}. [${activity.action}] ${activity.entityType}: ${
            activity.entityName
          }`
        );
        console.log(`      ${activity.description} - ${activity.timeAgo}`);
      });
    } else {
      console.log("❌ Error:", data10.message);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 2: Get last 5 activities (default)
    console.log("📊 2. Getting last 5 recent activities (default):");
    const response5 = await fetch(`${BASE_URL}/recent`);
    const data5 = await response5.json();

    if (data5.success) {
      console.log(`✅ Found ${data5.data.count} activities`);
      data5.data.activities.forEach((activity, index) => {
        console.log(
          `   ${index + 1}. [${activity.action}] ${activity.description} - ${
            activity.timeAgo
          }`
        );
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 3: Get activity statistics
    console.log("📊 3. Getting activity statistics:");
    const statsResponse = await fetch(`${BASE_URL}/stats?timeframe=today`);
    const statsData = await statsResponse.json();

    if (statsData.success) {
      console.log(`✅ Today's Activity Stats:`);
      console.log(`   Total activities: ${statsData.data.total}`);
      console.log(`   By action:`, statsData.data.byAction);
      console.log(`   By entity type:`, statsData.data.byEntityType);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 4: Get available filters
    console.log("📊 4. Getting available filters:");
    const filtersResponse = await fetch(`${BASE_URL}/filters`);
    const filtersData = await filtersResponse.json();

    if (filtersData.success) {
      console.log(
        `✅ Available entity types:`,
        filtersData.data.entityTypes.map((t) => t.value).join(", ")
      );
      console.log(
        `✅ Available actions:`,
        filtersData.data.actions.map((a) => a.value).join(", ")
      );
    }
  } catch (error) {
    console.error("❌ API Test Error:", error.message);
    console.log("\n💡 Make sure your server is running on the correct port!");
    console.log("   Start your server with: npm start or npm run dev");
  }
}

// Run the test
testRecentActivitiesAPI();

console.log(`
📖 API Usage Examples:

1. Get last 10 activities:
   GET ${BASE_URL}/recent?limit=10

2. Get recent college activities only:
   GET ${BASE_URL}/recent?limit=10&entityType=COLLEGE_PROFILE

3. Get recent creation activities only:
   GET ${BASE_URL}/recent?limit=10&action=CREATE

4. Get activities for specific entity:
   GET ${BASE_URL}/entity/COLLEGE_PROFILE/college-id-here

5. Get activity statistics:
   GET ${BASE_URL}/stats?timeframe=today

🎯 The API automatically logs activities when you:
   - Create/update colleges (createCollegeController)
   - Create/update placements (createPlacementController)
   - Create/update news articles (createNewsArticleController)
`);
