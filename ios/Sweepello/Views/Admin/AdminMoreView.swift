import SwiftUI

struct AdminMoreView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager

    var body: some View {
        NavigationStack {
            List {
                Section("Management") {
                    NavigationLink {
                        AdminServiceRequestsView()
                    } label: {
                        Label("Service Requests", systemImage: "doc.text.fill")
                    }

                    NavigationLink {
                        AdminApplicationsView()
                    } label: {
                        Label("Applications", systemImage: "person.badge.plus")
                    }

                    NavigationLink {
                        AdminScheduleView()
                    } label: {
                        Label("Schedule", systemImage: "calendar")
                    }

                    NavigationLink {
                        AdminPaymentsView()
                    } label: {
                        Label("Payments", systemImage: "creditcard.fill")
                    }
                }

                Section("Settings") {
                    Toggle("Dark Mode", isOn: $themeManager.isDarkMode)
                }

                Section {
                    Button(role: .destructive) {
                        authManager.signOut()
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}
