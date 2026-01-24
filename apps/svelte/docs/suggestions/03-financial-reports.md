# Suggestion 3: Financial Reports & Spending Trends

## Summary

Add a reports page with visualizations showing spending patterns over time, monthly comparisons, and category trends.

## Problem

Dashboard shows current month only. Users can't see spending trends, compare months, or identify patterns in their finances over time.

## Proposed Solution

### New Page: `/reports`

#### Report Types

1. **Monthly Comparison**
   - Bar chart: income vs expenses per month (last 6-12 months)
   - Line chart: net savings over time
   - Table: month-by-month breakdown

2. **Category Trends**
   - Line chart: spending per category over months
   - Identify categories with increasing/decreasing trends
   - Year-over-year comparison

3. **Income vs Expense Ratio**
   - Track savings rate over time
   - Average monthly surplus/deficit

4. **Wallet Health**
   - Balance history per wallet over time
   - Combine all wallets for net worth trend

### UI Components

1. **Report Selector**
   - Tabs or dropdown: "Monthly Overview", "Category Trends", "Savings Rate"
   - Date range picker: last 3/6/12 months, custom range, YTD

2. **Interactive Charts**
   - ECharts (already in use) for visualizations
   - Hover tooltips with exact values
   - Click to drill down into specific month

3. **Summary Cards**
   - Average monthly income/expense
   - Highest spending month
   - Best/worst categories

### Data Requirements

- Aggregate transactions by month/category
- Server endpoint: `/api/reports?type=monthly&range=6m`
- Pre-compute aggregates? Or calculate on demand

## Technical Considerations

- Performance: aggregating large transaction history
- Consider server-side aggregation vs client-side
- Cache report data (invalidate on new transaction)
- Mobile-friendly chart sizing

## Effort Estimate

- New route + layout
- 3-4 chart components
- API endpoint for aggregated data
- Date range logic

## Unresolved Questions

- How far back should reports go? (all time vs last 2 years)
- Pre-aggregate data nightly or compute on demand?
- Export reports as PDF?
