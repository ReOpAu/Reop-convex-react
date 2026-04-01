import ngeohash from "ngeohash";
/**
 * Get a 5x5 grid of geohashes centered on the input geohash
 * This matches the legacy implementation for proper neighbor search
 */
function getNeighbors(centerGeohash) {
    const grid = [centerGeohash];
    // Get the north and south neighbors of center
    const north = ngeohash.neighbor(centerGeohash, [1, 0]);
    const south = ngeohash.neighbor(centerGeohash, [-1, 0]);
    // Get east and west neighbors of center
    const east = ngeohash.neighbor(centerGeohash, [0, 1]);
    const west = ngeohash.neighbor(centerGeohash, [0, -1]);
    // Get diagonal neighbors
    const northeast = ngeohash.neighbor(north, [0, 1]);
    const northwest = ngeohash.neighbor(north, [0, -1]);
    const southeast = ngeohash.neighbor(south, [0, 1]);
    const southwest = ngeohash.neighbor(south, [0, -1]);
    // Add center row
    grid.push(west, east);
    // Add north row
    grid.push(northwest, north, northeast);
    // Add south row
    grid.push(southwest, south, southeast);
    // Get far east and west
    const farEast = ngeohash.neighbor(east, [0, 1]);
    const farWest = ngeohash.neighbor(west, [0, -1]);
    // Get their north and south neighbors
    grid.push(ngeohash.neighbor(farWest, [1, 0]), // far northwest
    ngeohash.neighbor(farEast, [1, 0]), // far northeast
    farWest, // far west
    farEast, // far east
    ngeohash.neighbor(farWest, [-1, 0]), // far southwest
    ngeohash.neighbor(farEast, [-1, 0]));
    // Get far north and south
    const farNorth = ngeohash.neighbor(north, [1, 0]);
    const farSouth = ngeohash.neighbor(south, [-1, 0]);
    // Add their east and west neighbors
    grid.push(ngeohash.neighbor(farNorth, [0, -1]), // far north west
    farNorth, // far north
    ngeohash.neighbor(farNorth, [0, 1]), // far north east
    ngeohash.neighbor(farSouth, [0, -1]), // far south west
    farSouth, // far south
    ngeohash.neighbor(farSouth, [0, 1]));
    // Remove any duplicates and ensure we have exactly 25 unique geohashes
    return [...new Set(grid)].slice(0, 25);
}
/**
 * Get geohashes for search based on level
 * @param geohash The center geohash
 * @param level The search level: 'same', 'neighbors', or 'neighborsOfNeighbors'
 * @returns Array of geohashes including the center and neighbors
 */
export function getGeohashesForLevel(geohash, level) {
    const result = new Set([geohash]);
    if (level === "same") {
        return Array.from(result);
    }
    // Get all neighbors in 5x5 grid for both 'neighbors' and 'neighborsOfNeighbors'
    const neighborCells = getNeighbors(geohash);
    neighborCells.forEach((n) => result.add(n));
    return Array.from(result);
}
/**
 * Get geohashes for searching with proper precision and neighbor calculation
 * This matches the legacy implementation
 */
export function getSearchGeohashes(geohash, precision = 5) {
    // Truncate to desired precision
    const truncatedGeohash = geohash.substring(0, precision);
    // Get neighbors at this precision level
    return getGeohashesForLevel(truncatedGeohash, "neighborsOfNeighbors");
}
