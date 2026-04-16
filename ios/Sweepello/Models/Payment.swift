import Foundation

struct Payment: Codable, Identifiable {
    let id: String
    let jobId: String
    let cleanerId: String?
    let amount: String
    let type: String
    let status: String
    let paidAt: String?

    var amountValue: Double {
        Double(amount) ?? 0
    }

    var isIncoming: Bool {
        type == "incoming"
    }
}
