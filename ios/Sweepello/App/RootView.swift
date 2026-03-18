import SwiftUI

struct RootView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            switch authManager.state {
            case .loading:
                SplashScreen()
            case .unauthenticated:
                LandingView()
            case .needsRoleSelection:
                RoleSelectionView()
            case .authenticated(let role):
                switch role {
                case .client:
                    ClientTabView()
                case .contractor:
                    ContractorTabView()
                case .admin:
                    AdminTabView()
                }
            case .contractorPending:
                ContractorPendingView()
            }
        }
        .animation(.easeInOut, value: authManager.state)
    }
}

struct SplashScreen: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 64))
                .foregroundStyle(Color.sweepelloPrimary)
            Text("Sweepello")
                .font(.largeTitle.bold())
            ProgressView()
        }
    }
}
