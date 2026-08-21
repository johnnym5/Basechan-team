import { getDistanceInMeters } from "./utils";

export const BRANCHES = {
  ABUJA: { lat: 9.049688, lng: 7.481471, name: "Abuja Branch" },
  BENIN: { lat: 6.333300, lng: 5.622200, name: "Benin Branch" }
}

export const GEOFENCE_RADIUS_METERS = 100;

export interface GeofenceResult {
    isWithinRange: boolean;
    distance: number;
    nearestBranch: string | null;
}

/**
 * Validates if the user's coordinates are within the radius of any organizational branch.
 */
export function validateGeofence(userLat: number, userLng: number): GeofenceResult {
  const distAbuja = getDistanceInMeters(userLat, userLng, BRANCHES.ABUJA.lat, BRANCHES.ABUJA.lng);
  const distBenin = getDistanceInMeters(userLat, userLng, BRANCHES.BENIN.lat, BRANCHES.BENIN.lng);

  const abujaInRange = distAbuja <= GEOFENCE_RADIUS_METERS;
  const beninInRange = distBenin <= GEOFENCE_RADIUS_METERS;

  if (abujaInRange) return { isWithinRange: true, distance: distAbuja, nearestBranch: BRANCHES.ABUJA.name };
  if (beninInRange) return { isWithinRange: true, distance: distBenin, nearestBranch: BRANCHES.BENIN.name };

  const minDistance = Math.min(distAbuja, distBenin);
  const nearest = distAbuja < distBenin ? BRANCHES.ABUJA.name : BRANCHES.BENIN.name;

  return { isWithinRange: false, distance: minDistance, nearestBranch: nearest };
}
