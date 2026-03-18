import SwiftUI

struct AdminJobsView: View {
    @State private var jobs: [Job] = []
    @State private var isLoading = true
    @State private var selectedFilter: String = "all"

    let filters = ["all", "pending", "broadcasting", "assigned", "in_progress", "completed"]

    var filteredJobs: [Job] {
        if selectedFilter == "all" { return jobs }
        return jobs.filter { $0.status == selectedFilter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter ScrollView
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filters, id: \.self) { filter in
                            FilterChip(
                                title: filter == "all" ? "All" : (JobStatus(rawValue: filter)?.displayName ?? filter),
                                isSelected: selectedFilter == filter
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    .padding()
                }

                if isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredJobs.isEmpty {
                    Spacer()
                    EmptyStateView(icon: "briefcase", title: "No jobs", message: "No jobs match this filter")
                    Spacer()
                } else {
                    List(filteredJobs) { job in
                        NavigationLink {
                            AdminJobDetailView(job: job)
                        } label: {
                            AdminJobRow(job: job)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Jobs")
            .refreshable { await loadJobs() }
            .task { await loadJobs() }
        }
    }

    private func loadJobs() async {
        isLoading = true
        jobs = (try? await APIClient.shared.get("/api/jobs")) ?? []
        isLoading = false
    }
}

struct AdminJobRow: View {
    let job: Job

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(job.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                Spacer()
                Text("$\(job.price)")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.adminPrimary)
            }
            HStack {
                StatusBadge(status: job.jobStatus.displayName, color: jobStatusColor(job.status))
                if let pay = job.cleanerPay {
                    Text("Pay: $\(pay)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let profit = job.profit {
                    Text("Profit: $\(profit)")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct AdminJobDetailView: View {
    let job: Job

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                StatusBadge(status: job.jobStatus.displayName, color: .blue)
                    .scaleEffect(1.3)
                    .padding()

                DetailSection(title: "Job Info") {
                    DetailRow(icon: "mappin.circle", label: "Address", value: job.propertyAddress)
                    DetailRow(icon: "calendar", label: "Date", value: job.scheduledDate)
                    DetailRow(icon: "dollarsign.circle", label: "Price", value: "$\(job.price)")
                    if let pay = job.cleanerPay {
                        DetailRow(icon: "banknote", label: "Cleaner Pay", value: "$\(pay)")
                    }
                    if let profit = job.profit {
                        DetailRow(icon: "chart.line.uptrend.xyaxis", label: "Profit", value: "$\(profit)")
                    }
                }

                if let rating = job.clientRating {
                    DetailSection(title: "Client Rating") {
                        HStack {
                            ForEach(1...5, id: \.self) { star in
                                Image(systemName: star <= rating ? "star.fill" : "star")
                                    .foregroundStyle(.yellow)
                            }
                        }
                        if let note = job.clientRatingNote {
                            Text(note)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Job #\(job.id.prefix(8))")
        .navigationBarTitleDisplayMode(.inline)
    }
}

func jobStatusColor(_ status: String) -> Color {
    switch status {
    case "pending": return .orange
    case "broadcasting": return .purple
    case "assigned": return .blue
    case "in_progress": return .indigo
    case "completed": return .green
    default: return .gray
    }
}
