import Foundation

enum JobStatus: String, Codable, CaseIterable {
    case pending
    case broadcasting
    case assigned
    case inProgress = "in_progress"
    case completed
    case cancelled

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .broadcasting: return "Finding Cleaners"
        case .assigned: return "Assigned"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }

    var color: String {
        switch self {
        case .pending: return "orange"
        case .broadcasting: return "purple"
        case .assigned: return "blue"
        case .inProgress: return "indigo"
        case .completed: return "green"
        case .cancelled: return "red"
        }
    }
}

struct Job: Codable, Identifiable {
    let id: String
    let clientId: String
    let cleanerId: String?
    let propertyAddress: String
    let scheduledDate: String
    let status: String
    let price: String
    let cleanerPay: String?
    let profit: String?
    let serviceRequestId: String?
    let notes: String?
    let clientRating: Int?
    let clientRatingNote: String?

    var jobStatus: JobStatus {
        JobStatus(rawValue: status) ?? .pending
    }

    var priceValue: Double {
        Double(price) ?? 0
    }

    var scheduledDateFormatted: Date? {
        ISO8601DateFormatter().date(from: scheduledDate)
    }
}
