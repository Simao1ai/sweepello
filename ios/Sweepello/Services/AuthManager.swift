import Foundation
import AuthenticationServices

// MARK: - Auth Manager

@MainActor
class AuthManager: ObservableObject {
    @Published var state: AuthState = .loading
    @Published var currentUser: User?
    @Published var userProfile: UserProfile?
    @Published var errorMessage: String?

    private let api = APIClient.shared

    init() {
        Task {
            await checkSession()
        }
    }

    // MARK: - Session Check

    func checkSession() async {
        do {
            let profile: UserProfile = try await api.get("/api/profile")
            self.userProfile = profile
            self.currentUser = User(
                id: profile.userId,
                username: nil,
                email: nil,
                firstName: nil,
                lastName: nil,
                profileImageUrl: nil,
                createdAt: nil
            )

            if profile.role == "contractor" && profile.approvalStatus == "pending" {
                state = .contractorPending
            } else {
                state = .authenticated(profile.userRole)
            }
        } catch let error as APIError {
            switch error {
            case .unauthorized, .notFound:
                state = .unauthenticated
            default:
                state = .unauthenticated
                errorMessage = error.localizedDescription
            }
        } catch {
            state = .unauthenticated
        }
    }

    // MARK: - Role Selection

    func selectRole(_ role: UserRole) async {
        do {
            let request = CreateProfileRequest(
                userId: currentUser?.id ?? "",
                role: role.rawValue,
                phone: nil,
                address: nil,
                city: nil,
                zipCode: nil
            )
            let profile: UserProfile = try await api.post("/api/profile", body: request)
            self.userProfile = profile

            if role == .contractor {
                state = .contractorPending
            } else {
                state = .authenticated(role)
            }
        } catch {
            errorMessage = "Failed to set role: \(error.localizedDescription)"
        }
    }

    // MARK: - Sign Out

    func signOut() {
        currentUser = nil
        userProfile = nil
        state = .unauthenticated
    }

    // MARK: - Refresh Profile

    func refreshProfile() async {
        await checkSession()
    }
}
