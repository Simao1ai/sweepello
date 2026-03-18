import SwiftUI

struct ClientTabView: View {
    @State private var selectedTab = 0
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        TabView(selection: $selectedTab) {
            ClientDashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            RequestServiceView()
                .tabItem {
                    Label("Book", systemImage: "plus.circle.fill")
                }
                .tag(1)

            MyBookingsView()
                .tabItem {
                    Label("Bookings", systemImage: "calendar")
                }
                .tag(2)

            ClientProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(3)
        }
        .tint(Color.clientPrimary)
    }
}
