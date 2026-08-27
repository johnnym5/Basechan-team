import { getDistanceInMeters } from "./utils";
import type { BranchLocation } from "./types";

export const GEOFENCE_RADIUS_METERS = 100;

export const BRANCHES: BranchLocation[] = [
  { id: 'abuja', name: 'Abuja Office', lat: 9.049688, lng: 7.481471, radius: 100 },
  { id: 'benin', name: 'Benin Office', lat: 6.333300, lng: 5.622200, radius: 100 }
];

export interface GeofenceResult {
    isWithinRange: boolean;
    distance: number;
    nearestBranch: string | null;
    branch?: BranchLocation | null;
}

/**
 * Returns the Branch Object if the user is inside the radius of any authorized branch, otherwise null.
 */
export function getClosestValidBranch(
  userLat: number,
  userLng: number,
  branches: BranchLocation[] = BRANCHES
): BranchLocation | null {
  const activeBranches = branches.length > 0 ? branches : BRANCHES;
  for (const branch of activeBranches) {
    const distance = getDistanceInMeters(userLat, userLng, branch.lat, branch.lng);
    const radius = branch.radius || GEOFENCE_RADIUS_METERS;
    if (distance <= radius) {
      return branch; // User is inside this specific geofence
    }
  }
  return null; // User is outside all office geofences
}

/**
 * Iterates through available branches and returns the branch.name if distance <= radius, otherwise null.
 */
export function isWithinBranchRadius(
  userLat: number,
  userLng: number,
  branches: BranchLocation[] = BRANCHES
): string | null {
  const activeBranch = getClosestValidBranch(userLat, userLng, branches);
  return activeBranch ? activeBranch.name : null;
}

/**
 * Validates if the user's coordinates are within the radius of any organizational branch.
 */
export function validateGeofence(
  userLat: number,
  userLng: number,
  branches: BranchLocation[] = []
): GeofenceResult {
  const activeBranches = branches.length > 0 ? branches : BRANCHES;
  const validBranch = getClosestValidBranch(userLat, userLng, activeBranches);

  const distances = activeBranches.map(branch => ({
    branch,
    name: branch.name,
    distance: getDistanceInMeters(userLat, userLng, branch.lat, branch.lng),
    radius: branch.radius || GEOFENCE_RADIUS_METERS
  }));

  if (validBranch) {
    const match = distances.find(d => d.branch.id === validBranch.id || d.name === validBranch.name);
    return {
      isWithinRange: true,
      distance: match ? match.distance : 0,
      nearestBranch: validBranch.name,
      branch: validBranch
    };
  }

  const nearest = distances.sort((a, b) => a.distance - b.distance)[0];
  return {
    isWithinRange: false,
    distance: nearest ? nearest.distance : 999999,
    nearestBranch: nearest ? nearest.name : "No defined branches",
    branch: null
  };
}

