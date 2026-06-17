/**
 * Generates cursor-based pagination arguments for Prisma
 */
export function getPaginationParams(cursor?: string, limit: number = 50) {
  const parsedLimit = Math.min(Math.max(limit, 1), 100);
  return {
    take: parsedLimit + 1, // Fetch 1 extra to determine if there is a next page
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0, // Skip the cursor element itself
  };
}

/**
 * Formats data list into a paginated object containing nextCursor
 */
export function formatPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number
) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    nextCursor,
  };
}
