import Foundation

// MARK: - User Role

enum UserRole: String, Codable, CaseIterable {
    case client
    case contractor
    case admin
}

// MARK: - Auth State

enum AuthState: Equatable {
    case loading
    case unauthenticated
    case needsRoleSelection
    case authenticated(UserRole)
    case contractorPending
}

// MARK: - User (from Replit Auth)

struct User: Codable, Identifiable {
    let id: String
    let username: String?
    let email: String?
    let firstName: String?
    let lastName: String?
    let profileImageUrl: String?
    let createdAt: String?

    var displayName: String {
        if let first = firstName, let last = lastName {
            return "\(first) \(last)"
        }
        return username ?? email ?? "User"
    }
}

// MARK: - User Profile

struct UserProfile: Codable, Identifiable {
    let id: String
    let userId: String
    let role: String
    let phone: String?
    let address: String?
    let city: String?
    let zipCode: String?
    let approvalStatus: String?
    let createdAt: String?

    var userRole: UserRole {
        UserRole(rawValue: role) ?? .client
    }

    var isApproved: Bool {
        approvalStatus == nil || approvalStatus == "approved"
    }
}

struct CreateProfileRequest: Codable {
    let userId: String
    let role: String
    let phone: String?
    let address: String?
    let city: String?
    let zipCode: String?
}
