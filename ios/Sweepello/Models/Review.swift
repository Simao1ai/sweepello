import Foundation

struct Review: Codable, Identifiable {
    let id: String
    let jobId: String
    let clientId: String
    let cleanerId: String
    let userId: String?
    let rating: Int
    let comment: String?
    let createdAt: String?
    let moderationStatus: String?
    let adminNote: String?
    let adminModifiedAt: String?
}

struct CreateReview: Codable {
    let jobId: String
    let clientId: String
    let cleanerId: String
    let userId: String?
    let rating: Int
    let comment: String?
}
