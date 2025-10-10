# 📅 Auto Placement Year Management

## Overview

This feature automatically manages the `availablePlacementReports` array in college profiles. When placement data is uploaded for a specific year, that year is automatically added to the college's available placement reports list.

## How It Works

### 🔄 Auto-Update Trigger

Years are automatically added when:

- **Placement Records** are created (`POST /api/v1/placement/:slug`)
- **Placement Statistics** are uploaded (`POST /api/v1/placement/:slug/stats`)
- **Top Recruiters** data is added (`POST /api/v1/placement/:slug/recruiters`)
- **Bulk Placement** data is uploaded

### 📊 Data Structure

```javascript
// College Profile Model
{
  name: "IIT Delhi",
  slug: "iit-delhi",
  availablePlacementReports: [2025, 2024, 2023], // Auto-managed array
  // ... other fields
}
```

### 🧹 Cache Management

- **Automatic Cache Clearing**: When placement years are updated, related caches are automatically cleared
- **NodeCache Patterns**: Clears `colleges:*`, `college:{slug}:*`, `placement:*`, `dashboard:*`
- **Redis Patterns**: Clears matching keys with college slug and year patterns
- **Performance Optimized**: Only clears relevant cache keys, not entire cache

## API Endpoints

### 1. Get Available Placement Years

```bash
GET /api/v1/college/:slug/placement-years
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "slug": "iit-delhi",
    "availableYears": [2025, 2024, 2023],
    "count": 3
  },
  "message": "Available placement years fetched successfully"
}
```

### 2. Manually Add a Year

```bash
POST /api/v1/college/:slug/placement-years
Content-Type: application/json

{
  "year": 2025
}
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "year": 2025,
    "added": true
  },
  "message": "Year 2025 added to placement reports successfully"
}
```

### 3. Remove a Year

```bash
DELETE /api/v1/college/:slug/placement-years/:year
```

**Response:**

```json
{
  "statusCode": 200,
  "data": {
    "year": 2023,
    "removed": true
  },
  "message": "Year 2023 removed from placement reports successfully"
}
```

## Auto-Update Examples

### Example 1: Creating Placement Record

```bash
POST /api/v1/placement/iit-delhi
Content-Type: application/json

{
  "branch": "Computer Science",
  "placementPercentage": 95,
  "year": 2025,  # ← This year will be auto-added
  "medianPackageLPA": 25,
  "highestPackageLPA": 55
}
```

**Result:** 2025 is automatically added to IIT Delhi's `availablePlacementReports`

### Example 2: Creating Placement Stats

```bash
POST /api/v1/placement/iit-delhi/stats
Content-Type: application/json

{
  "year": 2024,  # ← This year will be auto-added
  "totalOffers": 450,
  "highestPackage": 5500000,
  "averagePackage": 2800000
}
```

**Result:** 2024 is automatically added to IIT Delhi's `availablePlacementReports`

## Features

✅ **Auto-Addition**: Years added automatically when placement data is uploaded  
✅ **Duplicate Prevention**: Same year won't be added twice  
✅ **Sorted Order**: Years stored in descending order (newest first)  
✅ **Manual Management**: Add/remove years manually when needed  
✅ **Validation**: Only valid years (2000-2030) are accepted  
✅ **Error Handling**: Detailed error messages for invalid operations

## Implementation Details

### Auto-Update Function

```javascript
// utils/placementYearUpdater.js
export const autoUpdatePlacementYear = async (collegeSlug, placementData) => {
  // Extracts year from placement data
  // Adds to college's availablePlacementReports array
  // Prevents duplicates and sorts in descending order
};
```

### Integration Points

- **Placement Controller**: All placement creation functions
- **College Profile**: `availablePlacementReports` field as `[Number]`
- **Cache Management**: Clears relevant caches after updates

## Use Cases

1. **Frontend Display**: Show available years in dropdowns
2. **Report Generation**: Filter placement data by available years
3. **Data Integrity**: Ensure only years with actual data are listed
4. **User Experience**: Auto-populate year options based on uploaded data

## Testing

Run the test script to see the functionality in action:

```bash
./test-placement-years.sh
```

This will demonstrate:

- Current placement years for a college
- Auto-addition when placement data is uploaded
- Manual addition/removal of years
- Proper sorting and duplicate prevention

## Migration Note

For existing colleges, years can be:

1. **Auto-populated** by uploading placement data
2. **Manually added** using the API endpoints
3. **Bulk updated** through database migration if needed
