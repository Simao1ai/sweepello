import Foundation

enum NotificationType: String, Codable {
    case jobAssigned = "job_assigned"
    case jobOffer = "job_offer"
    case jobUpdate = "job_update"
    case jobCompleted = "job_completed"
    case general
    case broadcast

    var iconName: String {
        switch self {
        case .jobAssigned: return "person.badge.plus"
        case .jobOffer: return "bell.badge"
        case .jobUpdate: return "arrow.triangle.2.circlepath"
        case .jobCompleted: return "checkmark.circle"
        case .general: return "info.circle"
        case .broadcast: return "megaphone"
        }
    }
}

struct AppNotification: Codable, Identifiable {
    let id: String
    let userId: String
    let title: String
    let message: String
    let type: String
    let jobId: String?
    let serviceRequestId: String?
    let jobOfferId: String?
    let isRead: Bool
    let createdAt: String?

    var notificationType: NotificationType {
        NotificationType(rawValue: type) ?? .general
    }
}
