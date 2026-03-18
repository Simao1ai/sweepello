import SwiftUI

struct AdminTabView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        TabView {
            AdminDashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "square.grid.2x2.fill")
                }

            AdminJobsView()
                .tabItem {
                    Label("Jobs", systemImage: "briefcase.fill")
                }

            AdminCleanersView()
                .tabItem {
                    Label("Cleaners", systemImage: "person.3.fill")
                }

            AdminClientsView()
                .tabItem {
                    Label("Clients", systemImage: "person.2.fill")
                }

            AdminMoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
        }
        .tint(Color.adminPrimary)
    }
}
