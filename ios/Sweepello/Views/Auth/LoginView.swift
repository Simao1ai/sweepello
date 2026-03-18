import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                // Logo
                VStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 56))
                        .foregroundStyle(Color.sweepelloPrimary)
                    Text("Sweepello")
                        .font(.largeTitle.bold())
                    Text("Sign in to continue")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Sign in with Apple
                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    handleSignInResult(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 40)

                // Alternative: Email sign in
                VStack(spacing: 12) {
                    Text("or sign in with your Sweepello account")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    // This would open the web-based Replit Auth flow
                    Button {
                        openWebAuth()
                    } label: {
                        HStack {
                            Image(systemName: "globe")
                            Text("Sign in via Web")
                        }
                        .font(.headline)
                        .foregroundStyle(Color.sweepelloPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.sweepelloPrimary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.horizontal, 40)
                }

                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func handleSignInResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success:
            Task {
                await authManager.checkSession()
                dismiss()
            }
        case .failure:
            break
        }
    }

    private func openWebAuth() {
        guard let url = URL(string: "\(Configuration.apiBaseURL)/api/login") else { return }
        UIApplication.shared.open(url)
    }
}
