import Foundation

struct DashboardStats: Codable {
    let totalRevenue: Double?
    let totalJobs: Int?
    let activeCleaners: Int?
    let averageRating: Double?
    let pendingRequests: Int?
    let completedJobs: Int?
    let totalClients: Int?
    let margin: Double?
}

struct PricingEstimate: Codable {
    let estimatedPrice: Double
    let subcontractorCost: Double
    let margin: Double
}

struct CleanerAvailability: Codable, Identifiable {
    let id: String
    let cleanerId: String
    let dayOfWeek: Int
    let startTime: String
    let endTime: String
    let isAvailable: Bool

    var dayName: String {
        let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        guard dayOfWeek >= 0, dayOfWeek < days.count else { return "Unknown" }
        return days[dayOfWeek]
    }
}
