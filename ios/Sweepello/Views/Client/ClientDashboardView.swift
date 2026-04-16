import SwiftUI

struct ClientDashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @Binding var selectedTab: Int
    @State private var recentBookings: [ServiceRequest] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showRateSheet = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Banner
                    welcomeBanner

                    // Quick Actions
                    quickActions

                    // Recent Bookings
                    recentBookingsSection
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
            .sheet(isPresented: $showRateSheet) {
                if let lastCompleted = recentBookings.first(where: { $0.status == "completed" }) {
                    RateServiceView(serviceRequestId: lastCompleted.id)
                }
            }
        }
    }

    private var welcomeBanner: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Welcome back!")
                .font(.title2.bold())
            Text("Book your next cleaning in seconds")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            LinearGradient(colors: [Color.clientPrimary.opacity(0.1), Color.clientPrimary.opacity(0.05)],
                          startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var quickActions: some View {
        HStack(spacing: 12) {
            Button { selectedTab = 1 } label: {
                QuickActionButton(icon: "plus.circle.fill", title: "New Booking", color: .clientPrimary)
            }
            Button { selectedTab = 2 } label: {
                QuickActionButton(icon: "calendar", title: "My Bookings", color: .orange)
            }
            Button {
                if recentBookings.contains(where: { $0.status == "completed" }) {
                    showRateSheet = true
                } else {
                    selectedTab = 2
                }
            } label: {
                QuickActionButton(icon: "star.fill", title: "Rate Service", color: .yellow)
            }
        }
        .buttonStyle(.plain)
    }

    private var recentBookingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Bookings")
                .font(.headline)

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if recentBookings.isEmpty {
                EmptyStateView(
                    icon: "calendar.badge.plus",
                    title: "No bookings yet",
                    message: "Book your first cleaning service"
                )
            } else {
                ForEach(recentBookings) { request in
                    BookingCard(request: request)
                }
            }
        }
    }

    private func loadData() async {
        isLoading = true
        do {
            recentBookings = try await APIClient.shared.get("/api/service-requests/mine")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct BookingCard: View {
    let request: ServiceRequest

    var body: some View {
        HStack(spacing: 12) {
            VStack {
                Image(systemName: "house.fill")
                    .font(.title3)
                    .foregroundStyle(Color.clientPrimary)
            }
            .frame(width: 44, height: 44)
            .background(Color.clientPrimary.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(request.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                HStack(spacing: 8) {
                    StatusBadge(status: request.requestStatus.displayName, color: statusColor(for: request.status))
                    if let price = request.priceValue {
                        Text("$\(String(format: "%.0f", price))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    private func statusColor(for status: String) -> Color {
        switch status {
        case "pending": return .orange
        case "broadcasting": return .purple
        case "confirmed", "assigned": return .blue
        case "in_progress": return .indigo
        case "completed": return .green
        default: return .gray
        }
    }
}
