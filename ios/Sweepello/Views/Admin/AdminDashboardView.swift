import SwiftUI

struct AdminDashboardView: View {
    @State private var stats: DashboardStats?
    @State private var recentRequests: [ServiceRequest] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // KPI Stats
                    if let stats {
                        kpiGrid(stats)
                    }

                    // Pending Requests
                    pendingRequestsSection

                    // Quick Actions
                    adminQuickActions
                }
                .padding()
            }
            .navigationTitle("Admin Dashboard")
            .refreshable { await loadData() }
            .task { await loadData() }
        }
    }

    private func kpiGrid(_ stats: DashboardStats) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KPICard(title: "Revenue", value: "$\(String(format: "%.0f", stats.totalRevenue ?? 0))", icon: "dollarsign.circle.fill", color: .green)
            KPICard(title: "Total Jobs", value: "\(stats.totalJobs ?? 0)", icon: "briefcase.fill", color: .blue)
            KPICard(title: "Active Cleaners", value: "\(stats.activeCleaners ?? 0)", icon: "person.3.fill", color: .indigo)
            KPICard(title: "Avg Rating", value: String(format: "%.1f", stats.averageRating ?? 0), icon: "star.fill", color: .yellow)
            KPICard(title: "Pending", value: "\(stats.pendingRequests ?? 0)", icon: "clock.fill", color: .orange)
            KPICard(title: "Margin", value: "\(String(format: "%.0f", (stats.margin ?? 0) * 100))%", icon: "chart.line.uptrend.xyaxis", color: .purple)
        }
    }

    private var pendingRequestsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Pending Requests")
                    .font(.headline)
                Spacer()
                NavigationLink("View All") {
                    AdminServiceRequestsView()
                }
                .font(.caption)
            }

            let pending = recentRequests.filter { $0.status == "pending" || $0.status == "broadcasting" }
            if pending.isEmpty {
                Text("No pending requests")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 60)
            } else {
                ForEach(pending.prefix(5)) { request in
                    AdminRequestRow(request: request)
                }
            }
        }
    }

    private var adminQuickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                NavigationLink {
                    AdminApplicationsView()
                } label: {
                    AdminActionTile(icon: "doc.text.fill", title: "Applications", color: .orange)
                }

                NavigationLink {
                    AdminScheduleView()
                } label: {
                    AdminActionTile(icon: "calendar", title: "Schedule", color: .blue)
                }

                NavigationLink {
                    AdminPaymentsView()
                } label: {
                    AdminActionTile(icon: "creditcard.fill", title: "Payments", color: .green)
                }
            }
        }
    }

    private func loadData() async {
        isLoading = true
        async let statsResult: DashboardStats = APIClient.shared.get("/api/dashboard/stats")
        async let requestsResult: [ServiceRequest] = APIClient.shared.get("/api/service-requests")
        stats = try? await statsResult
        recentRequests = (try? await requestsResult) ?? []
        isLoading = false
    }
}

struct KPICard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Spacer()
            }
            Text(value)
                .font(.title3.bold())
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct AdminRequestRow: View {
    let request: ServiceRequest

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(request.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                HStack {
                    StatusBadge(status: request.requestStatus.displayName, color: .orange)
                    Text(request.serviceType.capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let price = request.priceValue {
                Text("$\(String(format: "%.0f", price))")
                    .font(.subheadline.bold())
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
    }
}

struct AdminActionTile: View {
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
