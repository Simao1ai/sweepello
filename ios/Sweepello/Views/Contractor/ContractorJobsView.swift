import SwiftUI

struct ContractorJobsView: View {
    @State private var jobs: [Job] = []
    @State private var isLoading = true
    @State private var selectedFilter: JobFilter = .active

    enum JobFilter: String, CaseIterable {
        case active = "Active"
        case completed = "Completed"
        case all = "All"
    }

    var filteredJobs: [Job] {
        switch selectedFilter {
        case .active: return jobs.filter { ["assigned", "in_progress"].contains($0.status) }
        case .completed: return jobs.filter { $0.status == "completed" }
        case .all: return jobs
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $selectedFilter) {
                    ForEach(JobFilter.allCases, id: \.self) { f in
                        Text(f.rawValue).tag(f)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredJobs.isEmpty {
                    Spacer()
                    EmptyStateView(icon: "briefcase", title: "No jobs", message: "Jobs will appear here when assigned")
                    Spacer()
                } else {
                    List(filteredJobs) { job in
                        NavigationLink {
                            ContractorJobDetailView(job: job, onStatusChange: { await loadJobs() })
                        } label: {
                            ContractorJobRow(job: job)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("My Jobs")
            .refreshable { await loadJobs() }
            .task { await loadJobs() }
        }
    }

    private func loadJobs() async {
        isLoading = true
        jobs = (try? await APIClient.shared.get("/api/contractor/jobs")) ?? []
        isLoading = false
    }
}

struct ContractorJobRow: View {
    let job: Job

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(job.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                Spacer()
                if let pay = job.cleanerPay {
                    Text("$\(pay)")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.contractorPrimary)
                }
            }
            HStack {
                StatusBadge(status: job.jobStatus.displayName, color: statusColor)
                Spacer()
                Text(job.scheduledDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch job.status {
        case "assigned": return .blue
        case "in_progress": return .indigo
        case "completed": return .green
        default: return .gray
        }
    }
}

struct ContractorJobDetailView: View {
    let job: Job
    let onStatusChange: () async -> Void
    @State private var isUpdating = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Status
                StatusBadge(status: job.jobStatus.displayName, color: .blue)
                    .scaleEffect(1.3)
                    .padding()

                // Details
                DetailSection(title: "Job Details") {
                    DetailRow(icon: "mappin.circle", label: "Address", value: job.propertyAddress)
                    DetailRow(icon: "calendar", label: "Date", value: job.scheduledDate)
                    if let pay = job.cleanerPay {
                        DetailRow(icon: "dollarsign.circle", label: "Your Pay", value: "$\(pay)")
                    }
                    if let notes = job.notes {
                        DetailRow(icon: "note.text", label: "Notes", value: notes)
                    }
                }

                // Action Buttons
                if job.status == "assigned" {
                    Button {
                        updateStatus("in_progress")
                    } label: {
                        Label("Start Job", systemImage: "play.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.contractorPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isUpdating)
                }

                if job.status == "in_progress" {
                    Button {
                        updateStatus("completed")
                    } label: {
                        Label("Complete Job", systemImage: "checkmark.circle.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.green)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isUpdating)
                }
            }
            .padding()
        }
        .navigationTitle("Job Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func updateStatus(_ newStatus: String) {
        isUpdating = true
        Task {
            struct StatusBody: Codable { let status: String }
            let _: Job? = try? await APIClient.shared.patch("/api/contractor/jobs/\(job.id)/status", body: StatusBody(status: newStatus))
            await onStatusChange()
            isUpdating = false
        }
    }
}
