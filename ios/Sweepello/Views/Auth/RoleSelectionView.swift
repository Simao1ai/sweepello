import SwiftUI

struct RoleSelectionView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 12) {
                Image(systemName: "person.2.circle")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.sweepelloPrimary)
                Text("Welcome to Sweepello!")
                    .font(.title.bold())
                Text("How would you like to use the app?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 16) {
                RoleCard(
                    icon: "house.fill",
                    title: "I'm a Client",
                    description: "Book cleaning services for my property",
                    color: .clientPrimary
                ) {
                    selectRole(.client)
                }

                RoleCard(
                    icon: "wrench.and.screwdriver.fill",
                    title: "I'm a Contractor",
                    description: "I want to provide cleaning services",
                    color: .contractorPrimary
                ) {
                    selectRole(.contractor)
                }
            }
            .padding(.horizontal)
            .disabled(isLoading)

            if isLoading {
                ProgressView()
            }

            Spacer()
        }
    }

    private func selectRole(_ role: UserRole) {
        isLoading = true
        Task {
            await authManager.selectRole(role)
            isLoading = false
        }
    }
}

struct RoleCard: View {
    let icon: String
    let title: String
    let description: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title)
                    .foregroundStyle(color)
                    .frame(width: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
        }
    }
}
