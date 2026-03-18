import SwiftUI

struct ContractorPendingView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var isChecking = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "clock.badge.checkmark")
                .font(.system(size: 72))
                .foregroundStyle(Color.contractorPrimary)

            Text("Application Under Review")
                .font(.title.bold())

            Text("Your contractor account is being reviewed by our team. You'll receive a notification once approved.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                checkStatus()
            } label: {
                HStack {
                    if isChecking {
                        ProgressView().tint(.white)
                    } else {
                        Text("Check Status")
                    }
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.contractorPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 40)
            .disabled(isChecking)

            Button {
                authManager.signOut()
            } label: {
                Text("Sign Out")
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
    }

    private func checkStatus() {
        isChecking = true
        Task {
            await authManager.refreshProfile()
            isChecking = false
        }
    }
}
