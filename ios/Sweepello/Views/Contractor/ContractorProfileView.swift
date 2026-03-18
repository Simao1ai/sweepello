import SwiftUI

struct ContractorProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var cleanerProfile: Cleaner?

    var body: some View {
        NavigationStack {
            List {
                // Profile Header
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.contractorPrimary)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(cleanerProfile?.name ?? authManager.currentUser?.displayName ?? "Contractor")
                                .font(.headline)
                            if let rating = cleanerProfile?.rating {
                                HStack(spacing: 4) {
                                    Image(systemName: "star.fill")
                                        .foregroundStyle(.yellow)
                                    Text(rating)
                                    Text("rating")
                                        .foregroundStyle(.secondary)
                                }
                                .font(.subheadline)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Stats
                if let profile = cleanerProfile {
                    Section("Performance") {
                        Label("Total Jobs: \(profile.totalJobs ?? 0)", systemImage: "briefcase")
                        Label("On-Time: \(profile.onTimePercent ?? 100)%", systemImage: "clock")
                        if let revenue = profile.totalRevenue {
                            Label("Total Earnings: $\(revenue)", systemImage: "dollarsign.circle")
                        }
                        if let area = profile.serviceArea {
                            Label("Service Area: \(area)", systemImage: "map")
                        }
                    }
                }

                // Settings
                Section("Preferences") {
                    Toggle("Dark Mode", isOn: $themeManager.isDarkMode)
                }

                // Sign Out
                Section {
                    Button(role: .destructive) {
                        authManager.signOut()
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Profile")
            .task { await loadProfile() }
        }
    }

    private func loadProfile() async {
        cleanerProfile = try? await APIClient.shared.get("/api/contractor/profile")
    }
}
