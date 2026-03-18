import SwiftUI

struct ClientProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager

    var body: some View {
        NavigationStack {
            List {
                // User Info
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.clientPrimary)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.displayName ?? "User")
                                .font(.headline)
                            Text(authManager.userProfile?.userRole.rawValue.capitalized ?? "Client")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Settings
                Section("Preferences") {
                    Toggle("Dark Mode", isOn: $themeManager.isDarkMode)
                }

                // Account
                Section("Account") {
                    if let phone = authManager.userProfile?.phone {
                        Label(phone, systemImage: "phone")
                    }
                    if let address = authManager.userProfile?.address {
                        Label(address, systemImage: "mappin")
                    }
                    if let zip = authManager.userProfile?.zipCode {
                        Label(zip, systemImage: "location")
                    }
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
        }
    }
}
