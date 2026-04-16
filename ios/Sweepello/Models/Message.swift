import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: String
    let jobId: String
    let senderId: String
    let senderRole: String
    let senderName: String
    let content: String
    let isRead: Bool
    let createdAt: String?
}

struct SendMessageRequest: Codable {
    let jobId: String
    let senderId: String
    let senderRole: String
    let senderName: String
    let content: String
}
