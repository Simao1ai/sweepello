import Foundation

struct Client: Codable, Identifiable {
    let id: String
    let userId: String?
    let name: String
    let email: String?
    let phone: String?
    let propertyAddress: String
    let propertyType: String
    let city: String?
    let zipCode: String?
    let bedrooms: Int?
    let bathrooms: Int?
    let notes: String?
    let isActive: Bool?
    let isVip: Bool?
    let adminNote: String?
    let clientRating: String?
    let clientRatingCount: Int?
}
