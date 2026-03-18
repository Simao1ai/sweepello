import Foundation

enum OfferStatus: String, Codable {
    case offered
    case accepted
    case declined
    case expired

    var displayName: String {
        switch self {
        case .offered: return "Pending"
        case .accepted: return "Accepted"
        case .declined: return "Declined"
        case .expired: return "Expired"
        }
    }
}

struct JobOffer: Codable, Identifiable {
    let id: String
    let serviceRequestId: String
    let cleanerId: String
    let status: String
    let priorityRank: Int
    let offeredAt: String?
    let respondedAt: String?
    let expiresAt: String?

    var offerStatus: OfferStatus {
        OfferStatus(rawValue: status) ?? .offered
    }

    var isExpired: Bool {
        guard let expires = expiresAt,
              let date = ISO8601DateFormatter().date(from: expires) else { return false }
        return date < Date()
    }
}
