# Suggestion 4: Transaction Search & Advanced Filtering

## Summary

Add full-text search and advanced filtering to find transactions by description, amount range, date range, and multiple categories.

## Problem

Current filtering is limited to single category, wallet, and paid status. Users can't search descriptions or filter by amount ranges. Finding old transactions is difficult.

## Proposed Solution

### Enhanced Filter Bar

1. **Search Input**
   - Full-text search on description field
   - Debounced input (300ms)
   - Highlight matches in results

2. **Amount Range Filter**
   - Min/max amount inputs
   - Quick presets: "Under $50", "$50-200", "Over $200"

3. **Date Range Filter**
   - Beyond single month: custom start/end dates
   - Quick presets: "Last 7 days", "Last 30 days", "This year"

4. **Multi-Category Selection**
   - Select multiple categories (checkbox list)
   - Include/exclude logic

5. **Combined Filters**
   - All filters work together (AND logic)
   - "Clear all filters" button
   - Save filter presets? (optional)

### UI Changes

1. **Collapsible Advanced Filters**
   - Basic: search + category + wallet (visible)
   - Advanced: amount range, date range, multi-category (expandable)

2. **Active Filter Pills**
   - Show active filters as removable chips
   - Quick clear per filter

3. **Results Count**
   - "Showing 23 of 156 transactions"

### Technical Implementation

- URL params for all filters (persist on refresh via nuqs)
- Server-side filtering for performance
- Index `description` column for search (or use `ILIKE`)
- Consider PostgreSQL full-text search for better matching

## Technical Considerations

- Performance with many filters + large datasets
- PostgreSQL `ILIKE` vs `tsvector` full-text search
- Filter state in URL vs local state
- Mobile UX for many filter options

## Effort Estimate

- Modify filter components
- Update API query builder
- Add indexes to database
- URL param management expansion

## Unresolved Questions

- Full-text search (tsvector) worth the complexity vs simple ILIKE?
- Save filter presets for reuse?
- Search in category names too?
