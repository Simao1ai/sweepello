import SwiftUI

struct ContractorTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var wsManager = WebSocketManager.shared
    @State private var hasCompletedOnboarding = false
    @State private var isCheckingOnboarding = true

    var body: some View {
        Group {
            if isCheckingOnboarding {
                ProgressView("Loading...")
            } else if !hasCompletedOnboarding {
                ContractorOnboardingView(onComplete: {
                    hasCompletedOnboarding = true
                })
            } else {
                contractorTabs
            }
        }
        .task {
            await checkOnboarding()
        }
    }

    private var contractorTabs: some View {
        TabView {
            ContractorDashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "square.grid.2x2.fill")
                }

            ContractorJobsView()
                .tabItem {
                    Label("Jobs", systemImage: "briefcase.fill")
                }

            ContractorAvailabilityView()
                .tabItem {
                    Label("Schedule", systemImage: "calendar")
                }

            ContractorNotificationsView()
                .tabItem {
                    Label("Alerts", systemImage: "bell.fill")
                }

            ContractorProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
        }
        .tint(Color.contractorPrimary)
        .onAppear {
            if let userId = authManager.userProfile?.userId {
                wsManager.connect(userId: userId)
            }
        }
    }

    private func checkOnboarding() async {
        do {
            let data: ContractorOnboardingData = try await APIClient.shared.get("/api/contractor/onboarding")
            hasCompletedOnboarding = data.isComplete
        } catch {
            hasCompletedOnboarding = false
        }
        isCheckingOnboarding = false
    }
}
