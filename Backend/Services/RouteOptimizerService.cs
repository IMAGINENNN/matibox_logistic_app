using Backend.Models;

namespace Backend.Services;

public class RouteOptimizerService
{
    // Default Matibox Central Dispatch Hub coordinates (Maridalsveien 300, 0872 Oslo)
    public const double DefaultOsloLat = 59.953677;
    public const double DefaultOsloLng = 10.760444;

    /// <summary>
    /// Hybrid Priority + Haversine Nearest-Neighbor Route Calculation:
    /// 1. Groups stops into 30-minute delivery deadline windows (so urgent deadlines always take priority).
    /// 2. Within each deadline window, chains stops by shortest Haversine distance starting from the driver's live GPS
    ///    coordinates (or the Oslo Central Kitchen fallback) and continuing from each stop to the next.
    /// </summary>
    public void OptimizeDriverStops(
        List<DeliveryAssignment> driverStops,
        double? startLatitude = null,
        double? startLongitude = null)
    {
        if (driverStops.Count == 0)
            return;

        double currentLat = startLatitude ?? DefaultOsloLat;
        double currentLng = startLongitude ?? DefaultOsloLng;

        // Group by 30-minute time window buckets (e.g. 08:00-08:29, 08:30-08:59, etc.)
        var buckets = driverStops
            .GroupBy(s => ParseMinutesFromMidnight(s.Kindergarten?.Time) / 30)
            .OrderBy(g => g.Key)
            .ToList();

        int sequence = 1;

        foreach (var bucket in buckets)
        {
            var remainingInBucket = bucket.ToList();

            while (remainingInBucket.Count > 0)
            {
                // Pick the stop with the earliest exact deadline within the bucket, breaking ties (or close times) by Haversine distance
                var nextStop = remainingInBucket
                    .OrderBy(s =>
                    {
                        double distKm = CalculateHaversineDistanceKm(
                            currentLat,
                            currentLng,
                            s.Kindergarten.Latitude,
                            s.Kindergarten.Longitude);
                        // Combine deadline urgency inside the 30-min window with distance in km
                        int mins = ParseMinutesFromMidnight(s.Kindergarten.Time);
                        return distKm + (mins % 30) * 0.08;
                    })
                    .First();

                nextStop.SequenceOrder = sequence++;
                currentLat = nextStop.Kindergarten.Latitude;
                currentLng = nextStop.Kindergarten.Longitude;
                remainingInBucket.Remove(nextStop);
            }
        }
    }

    private static int ParseMinutesFromMidnight(string? timeStr)
    {
        if (string.IsNullOrWhiteSpace(timeStr))
            return 9 * 60;

        if (TimeOnly.TryParse(timeStr, out var time))
        {
            return time.Hour * 60 + time.Minute;
        }

        return 9 * 60;
    }

    public static double CalculateHaversineDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double EarthRadiusKm = 6371.0;
        double dLat = DegreesToRadians(lat2 - lat1);
        double dLon = DegreesToRadians(lon2 - lon1);

        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;
}
