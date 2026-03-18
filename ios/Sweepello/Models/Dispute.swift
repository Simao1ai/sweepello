import Foundation

struct Dispute: Codable, Identifiable {
    let id: String
    let serviceRequestId: String?
    let jobId: String?
    let reportedByUserId: String
    let clientId: String?
    let cleanerId: String?
    let title: String
    let description: String
    let status: String
    let adminNote: String?
    let resolutionNote: String?
    let createdAt: String?
    let resolvedAt: String?
}
