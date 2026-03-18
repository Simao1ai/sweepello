import SwiftUI

struct AdminApplicationsView: View {
    @State private var applications: [ContractorApplication] = []
    @State private var isLoading = true

    var pendingApps: [ContractorApplication] {
        applications.filter { $0.status == "pending" }
    }

    var reviewedApps: [ContractorApplication] {
        applications.filter { $0.status != "pending" }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if applications.isEmpty {
                EmptyStateView(icon: "doc.text", title: "No applications", message: "No contractor applications yet")
            } else {
                List {
                    if !pendingApps.isEmpty {
                        Section("Pending Review (\(pendingApps.count))") {
                            ForEach(pendingApps) { app in
                                ApplicationRow(application: app, onAction: { await loadApps() })
                            }
                        }
                    }

                    if !reviewedApps.isEmpty {
                        Section("Reviewed") {
                            ForEach(reviewedApps) { app in
                                ApplicationRow(application: app, onAction: { await loadApps() })
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Applications")
        .refreshable { await loadApps() }
        .task { await loadApps() }
    }

    private func loadApps() async {
        isLoading = true
        applications = (try? await APIClient.shared.get("/api/contractor-applications")) ?? []
        isLoading = false
    }
}

struct ApplicationRow: View {
    let application: ContractorApplication
    let onAction: () async -> Void
    @State private var isProcessing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(application.fullName)
                    .font(.subheadline.bold())
                Spacer()
                StatusBadge(
                    status: application.status.capitalized,
                    color: application.status == "approved" ? .green : application.status == "rejected" ? .red : .orange
                )
            }

            HStack(spacing: 12) {
                Label(application.city, systemImage: "location")
                Label("\(application.yearsExperience) yrs", systemImage: "clock")
                if application.isInsured {
                    Label("Insured", systemImage: "shield.checkered")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if application.status == "pending" {
                HStack(spacing: 12) {
                    Button {
                        approve()
                    } label: {
                        Text("Approve")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .background(Color.green)
                            .clipShape(Capsule())
                    }

                    Button {
                        reject()
                    } label: {
                        Text("Reject")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .background(Color.red)
                            .clipShape(Capsule())
                    }
                }
                .disabled(isProcessing)
            }
        }
        .padding(.vertical, 4)
    }

    private func approve() {
        isProcessing = true
        Task {
            struct Body: Codable { let status: String }
            let _: ContractorApplication? = try? await APIClient.shared.patch("/api/contractor-applications/\(application.id)", body: Body(status: "approved"))
            await onAction()
            isProcessing = false
        }
    }

    private func reject() {
        isProcessing = true
        Task {
            struct Body: Codable { let status: String }
            let _: ContractorApplication? = try? await APIClient.shared.patch("/api/contractor-applications/\(application.id)", body: Body(status: "rejected"))
            await onAction()
            isProcessing = false
        }
    }
}
