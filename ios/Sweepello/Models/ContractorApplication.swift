import Foundation

struct ContractorApplication: Codable, Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let city: String
    let zipCode: String
    let serviceZipCodes: String
    let yearsExperience: Int
    let cleaningTypes: String
    let isInsured: Bool
    let hasOwnSupplies: Bool
    let references: String?
    let availableDays: String
    let availableHours: String
    let agreementAcknowledged: Bool
    let status: String
    let adminNote: String?
    let createdAt: String?
    let reviewedAt: String?

    var fullName: String {
        "\(firstName) \(lastName)"
    }
}

struct CreateContractorApplication: Codable {
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let city: String
    let zipCode: String
    let serviceZipCodes: String
    let yearsExperience: Int
    let cleaningTypes: String
    let isInsured: Bool
    let hasOwnSupplies: Bool
    let references: String?
    let availableDays: String
    let availableHours: String
    let agreementAcknowledged: Bool
}
