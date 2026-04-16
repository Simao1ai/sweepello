import Foundation

struct Cleaner: Codable, Identifiable {
    let id: String
    let userId: String?
    let name: String
    let email: String?
    let phone: String
    let payRate: Int
    let status: String
    let statusNote: String?
    let rating: String?
    let onTimePercent: Int?
    let totalJobs: Int?
    let totalRevenue: String?
    let serviceArea: String?
    let zipCodes: String?
    let isFeatured: Bool?
    let adminNote: String?
    let isOnline: Bool?
    let currentLat: String?
    let currentLng: String?
    let lastSeenAt: String?

    var ratingValue: Double {
        Double(rating ?? "5.00") ?? 5.0
    }

    var zipCodeList: [String] {
        zipCodes?.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) } ?? []
    }

    var isActive: Bool {
        status == "active"
    }
}
