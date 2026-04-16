import Foundation

enum PropertyType: String, Codable, CaseIterable {
    case residential
    case commercial
    case airbnb

    var displayName: String {
        switch self {
        case .residential: return "Residential"
        case .commercial: return "Commercial"
        case .airbnb: return "Airbnb"
        }
    }
}

enum ServiceType: String, Codable, CaseIterable {
    case standard
    case deep
    case moveOut = "move-out"

    var displayName: String {
        switch self {
        case .standard: return "Standard Clean"
        case .deep: return "Deep Clean"
        case .moveOut: return "Move-Out Clean"
        }
    }
}

enum RequestStatus: String, Codable {
    case pending
    case broadcasting
    case matched
    case confirmed
    case inProgress = "in_progress"
    case completed
    case cancelled

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .broadcasting: return "Finding Cleaners"
        case .matched: return "Matched"
        case .confirmed: return "Confirmed"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
}

struct ServiceRequest: Codable, Identifiable {
    let id: String
    let userId: String
    let propertyAddress: String
    let city: String?
    let zipCode: String?
    let propertyType: String
    let serviceType: String
    let bedrooms: Int?
    let bathrooms: Int?
    let basement: Bool?
    let requestedDate: String
    let preferredTime: String?
    let specialInstructions: String?
    let status: String
    let estimatedPrice: String?
    let subcontractorCost: String?
    let assignedCleanerId: String?
    let preferredCleanerId: String?
    let jobId: String?
    let squareFootage: Int?
    let isOnDemand: Bool?
    let surgeMultiplier: String?
    let createdAt: String?

    var requestStatus: RequestStatus {
        RequestStatus(rawValue: status) ?? .pending
    }

    var priceValue: Double? {
        guard let p = estimatedPrice else { return nil }
        return Double(p)
    }
}

struct CreateServiceRequest: Codable {
    let userId: String
    let propertyAddress: String
    let city: String?
    let zipCode: String?
    let propertyType: String
    let serviceType: String
    let bedrooms: Int?
    let bathrooms: Int?
    let basement: Bool?
    let requestedDate: String
    let preferredTime: String?
    let specialInstructions: String?
    let squareFootage: Int?
    let preferredCleanerId: String?
    let isOnDemand: Bool
    let surgeMultiplier: String?
}
