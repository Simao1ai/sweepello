import SwiftUI

struct ContractorDashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var wsManager = WebSocketManager.shared
    @State private var jobs: [Job] = []
    @State private var pendingOffers: [JobOffer] = []
    @State private var isOnline = false
    @State private var isLoading = true

    var activeJobs: [Job] {
        jobs.filter { $0.status == "assigned" || $0.status == "in_progress" }
    }

    var completedCount: Int {
        jobs.filter { $0.status == "completed" }.count
    }

    var totalEarnings: Double {
        jobs.filter { $0.status == "completed" }
            .compactMap { Double($0.cleanerPay ?? "0") }
            .reduce(0, +)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Online Toggle
                    onlineToggle

                    // Stats Grid
                    statsGrid

                    // Pending Offers
                    if !pendingOffers.isEmpty {
                        pendingOffersSection
                    }

                    // Active Jobs
                    activeJobsSection
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .refreshable { await loadData() }
            .task { await loadData() }
        }
    }

    private var onlineToggle: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(isOnline ? "You're Online" : "You're Offline")
                    .font(.headline)
                Text(isOnline ? "Receiving job offers" : "Go online to receive offers")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Toggle("", isOn: $isOnline)
                .tint(Color.contractorPrimary)
                .onChange(of: isOnline) { _, newValue in
                    wsManager.sendGoOnline(newValue)
                }
        }
        .padding()
        .background(isOnline ? Color.contractorPrimary.opacity(0.1) : Color(.systemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Active Jobs", value: "\(activeJobs.count)", icon: "briefcase.fill", color: .blue)
            StatCard(title: "Completed", value: "\(completedCount)", icon: "checkmark.circle.fill", color: .green)
            StatCard(title: "Pending Offers", value: "\(pendingOffers.count)", icon: "bell.badge.fill", color: .orange)
            StatCard(title: "Earnings", value: "$\(String(format: "%.0f", totalEarnings))", icon: "dollarsign.circle.fill", color: .contractorPrimary)
        }
    }

    private var pendingOffersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("New Job Offers")
                    .font(.headline)
                Spacer()
                Text("\(pendingOffers.count)")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange)
                    .clipShape(Capsule())
            }

            ForEach(pendingOffers) { offer in
                JobOfferCard(offer: offer) {
                    await acceptOffer(offer)
                } onDecline: {
                    await declineOffer(offer)
                }
            }
        }
    }

    private var activeJobsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Active Jobs")
                .font(.headline)

            if activeJobs.isEmpty {
                EmptyStateView(
                    icon: "briefcase",
                    title: "No active jobs",
                    message: "New offers will appear here"
                )
            } else {
                ForEach(activeJobs) { job in
                    ActiveJobCard(job: job)
                }
            }
        }
    }

    private func loadData() async {
        isLoading = true
        async let jobsResult: [Job] = APIClient.shared.get("/api/contractor/jobs")
        async let offersResult: [JobOffer] = APIClient.shared.get("/api/contractor/offers")
        jobs = (try? await jobsResult) ?? []
        pendingOffers = (try? await offersResult) ?? []
        isLoading = false
    }

    private func acceptOffer(_ offer: JobOffer) async {
        struct EmptyBody: Codable {}
        let _: JobOffer? = try? await APIClient.shared.post("/api/contractor/offers/\(offer.id)/accept", body: EmptyBody())
        await loadData()
    }

    private func declineOffer(_ offer: JobOffer) async {
        struct EmptyBody: Codable {}
        let _: JobOffer? = try? await APIClient.shared.post("/api/contractor/offers/\(offer.id)/decline", body: EmptyBody())
        await loadData()
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Spacer()
            }
            HStack {
                Text(value)
                    .font(.title2.bold())
                Spacer()
            }
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct JobOfferCard: View {
    let offer: JobOffer
    let onAccept: () async -> Void
    let onDecline: () async -> Void
    @State private var isProcessing = false

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "bell.badge.fill")
                    .foregroundStyle(.orange)
                Text("New Job Offer")
                    .font(.subheadline.bold())
                Spacer()
                if offer.priorityRank == 0 {
                    Text("Preferred")
                        .font(.caption2.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.contractorPrimary)
                        .clipShape(Capsule())
                }
            }

            HStack(spacing: 12) {
                Button {
                    isProcessing = true
                    Task {
                        await onAccept()
                        isProcessing = false
                    }
                } label: {
                    Text("Accept")
                        .font(.subheadline.bold())
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.contractorPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    isProcessing = true
                    Task {
                        await onDecline()
                        isProcessing = false
                    }
                } label: {
                    Text("Decline")
                        .font(.subheadline.bold())
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .disabled(isProcessing)
        }
        .padding()
        .background(Color.orange.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }
}

struct ActiveJobCard: View {
    let job: Job

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: job.status == "in_progress" ? "arrow.triangle.2.circlepath.circle.fill" : "briefcase.fill")
                .font(.title3)
                .foregroundStyle(job.status == "in_progress" ? Color.indigo : Color.blue)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(job.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                StatusBadge(status: job.jobStatus.displayName, color: job.status == "in_progress" ? .indigo : .blue)
            }
            Spacer()
            if let pay = job.cleanerPay {
                Text("$\(pay)")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.contractorPrimary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }
}
